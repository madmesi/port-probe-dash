package api

import (
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func (h *Handlers) HandleSSH(w http.ResponseWriter, r *http.Request) {
	// Extract token from query parameter
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Token required", http.StatusUnauthorized)
		return
	}

	// Verify token
	claims, err := h.jwtManager.Verify(token)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	userID := claims.UserID
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	vars := mux.Vars(r)
	serverID := vars["serverId"]

	// Get server details
	server, err := h.stores.Servers.GetByID(serverID)
	if err != nil {
		http.Error(w, "Server not found", http.StatusNotFound)
		return
	}

	// Check permissions
	if !isAdmin {
		hasAccess, _ := h.stores.Permissions.HasAccess(userID, serverID)
		if !hasAccess {
			http.Error(w, "Access denied", http.StatusForbidden)
			return
		}
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// SSH connection
	if server.SSHUsername == nil || *server.SSHUsername == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: SSH username not configured for this server"))
		return
	}

	config := &ssh.ClientConfig{
		User: *server.SSHUsername,
		Auth: []ssh.AuthMethod{
			ssh.Password(""), // You'll need to implement proper auth
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // WARNING: Use proper host key verification in production
	}

	sshAddr := fmt.Sprintf("%s:%d", server.IPAddress, server.SSHPort)
	client, err := ssh.Dial("tcp", sshAddr, config)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to connect to SSH server: %v", err)))
		return
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to create SSH session: %v", err)))
		return
	}
	defer session.Close()

	// Set up terminal modes
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm-256color", 40, 80, modes); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to request PTY: %v", err)))
		return
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to get stdin: %v", err)))
		return
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to get stdout: %v", err)))
		return
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to get stderr: %v", err)))
		return
	}

	if err := session.Shell(); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: Failed to start shell: %v", err)))
		return
	}

	// Copy SSH output to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stdout.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Println("Stdout read error:", err)
				}
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stderr.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Println("Stderr read error:", err)
				}
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	// Copy WebSocket input to SSH
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if _, err := stdin.Write(message); err != nil {
			break
		}
	}

	session.Wait()
}
