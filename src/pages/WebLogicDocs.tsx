import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Book, ChevronRight } from "lucide-react";

interface Section {
  id: string;
  title: string;
  content: string;
}

const sections: Section[] = [
  {
    id: "introduction",
    title: "Introduction to WebLogic Server 12",
    content: `Oracle WebLogic Server is a scalable, enterprise-ready Java Platform, Enterprise Edition (Java EE) application server. With over 33% market share, it provides a complete implementation of the Java EE specification with additional features to support mission-critical applications.

**Key Features:**
- Complete Java EE 7 implementation
- High availability and clustering capabilities
- Advanced deployment and staging options
- Integrated management and monitoring console
- Support for various protocols (HTTP, HTTPS, T3, IIOP, IIOPS)
- Built-in security features and SSL/TLS
- WebLogic Diagnostic Framework (WLDF)
- Work Managers for application prioritization

**Use Cases:**
- Enterprise application hosting
- E-commerce platforms
- Financial services applications
- Healthcare systems
- Government applications`
  },
  {
    id: "prerequisites",
    title: "Prerequisites for Rocky Linux 9.6",
    content: `Before installing WebLogic Server 12 on Rocky Linux 9.6, ensure the following prerequisites are met:

**System Requirements:**
- Rocky Linux 9.6 (64-bit)
- Minimum 4GB RAM (8GB+ recommended for production)
- Minimum 10GB free disk space (20GB+ recommended)
- Java Development Kit (JDK) 8 or 11
- Swap space: At least 2GB

**Required Packages:**
\`\`\`bash
sudo dnf update -y
sudo dnf install -y java-11-openjdk java-11-openjdk-devel
sudo dnf install -y unzip wget tar gzip
sudo dnf install -y net-tools bind-utils
\`\`\`

**Kernel Parameters:**
Edit /etc/sysctl.conf:
\`\`\`bash
kernel.shmmax = 4294967295
kernel.shmall = 2097152
kernel.shmmni = 4096
kernel.sem = 250 32000 100 128
fs.file-max = 6815744
net.ipv4.ip_local_port_range = 9000 65500
\`\`\`

**User Setup:**
Create a dedicated user for WebLogic:
\`\`\`bash
sudo groupadd -g 1001 wlsadmin
sudo useradd -g wlsadmin -u 1001 -d /home/wlsadmin -m -s /bin/bash wlsadmin
sudo passwd wlsadmin

# Create directory structure
sudo mkdir -p /u01/oracle/middleware
sudo chown -R wlsadmin:wlsadmin /u01
\`\`\`

**Environment Variables:**
Add to ~/.bash_profile:
\`\`\`bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
export MW_HOME=/u01/oracle/middleware
export WLS_HOME=$MW_HOME/wlserver
export PATH=$JAVA_HOME/bin:$PATH
\`\`\``
  },
  {
    id: "installation",
    title: "WebLogic Server Installation",
    content: `**Step 1: Download WebLogic Server**
Download the WebLogic Server 12.2.1.x installer from Oracle's official website (requires Oracle account).

**Step 2: Verify Java Installation**
\`\`\`bash
java -version
# Should show Java 1.8 or Java 11
\`\`\`

**Step 3: Set Environment Variables**
\`\`\`bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
export MW_HOME=/u01/oracle/middleware
export WLS_HOME=$MW_HOME/wlserver
export PATH=$JAVA_HOME/bin:$PATH
\`\`\`

**Step 4: Run the Installer**
\`\`\`bash
# For GUI installation
java -jar fmw_12.2.1.4.0_wls.jar

# For silent installation
java -jar fmw_12.2.1.4.0_wls.jar -silent -responseFile /path/to/response.rsp
\`\`\`

**Step 5: Installation Wizard**
- Welcome screen: Click Next
- Auto Updates: Skip auto updates (optional)
- Installation Type: Choose "WebLogic Server" (typical)
- Installation Location: /u01/oracle/middleware
- Installation Type: Select Fusion Middleware Infrastructure
- Prerequisite Checks: Wait for validation
- Security Updates: Provide email (optional)
- Installation Summary: Review and proceed
- Installation Progress: Wait for completion

**Step 6: Verify Installation**
\`\`\`bash
cd $MW_HOME/wlserver/server/bin
./setWLSEnv.sh
java weblogic.version

# Should display WebLogic Server version information
\`\`\`

**Post-Installation:**
- Note the installation directory
- Verify environment variables
- Check log files for any errors: $MW_HOME/oraInventory/logs`
  },
  {
    id: "domain",
    title: "Creating a WebLogic Domain",
    content: `A WebLogic domain is the basic administration unit for WebLogic Server. It consists of one Administration Server and zero or more Managed Servers.

**Create Domain Using Configuration Wizard:**
\`\`\`bash
cd $MW_HOME/oracle_common/common/bin
./config.sh
\`\`\`

**Domain Configuration Steps:**

**1. Configuration Type:**
- Select "Create a new domain"
- Domain location: /u01/oracle/domains/base_domain

**2. Templates:**
- Select "Basic WebLogic Server Domain"
- Optionally add other templates (Coherence, JRF, etc.)

**3. Administrator Account:**
- Username: weblogic
- Password: (create strong password, min 8 chars)
- Confirm password

**4. Domain Mode and JDK:**
- Domain Mode: Production (for production) or Development
- JDK: Select installed JDK (Java 11 recommended)

**5. Database Configuration (if JRF selected):**
- Database Type: Oracle, MySQL, etc.
- JDBC URL, username, password

**6. Advanced Configuration:**
- Administration Server: Configure name, ports
- Node Manager: Configure Node Manager
- Managed Servers: Create managed servers
- Clusters: Create clusters
- Machine: Define machines

**7. Administration Server Configuration:**
- Name: AdminServer
- Listen Address: All Local Addresses or specific IP
- Listen Port: 7001
- SSL: Enable SSL (port 7002)
- Server Groups: Leave default

**8. Node Manager:**
- Type: Per Domain Default Location
- Credentials: Username and password for Node Manager

**9. Review and Create:**
- Review all configurations
- Click Create to generate domain

**Start Admin Server:**
\`\`\`bash
cd /u01/oracle/domains/base_domain/bin
nohup ./startWebLogic.sh > admin.out 2>&1 &

# Monitor startup
tail -f admin.out

# When ready, you'll see: "Server started in RUNNING mode"
\`\`\`

**Access Admin Console:**
Open browser: http://hostname:7001/console
Login with weblogic credentials`
  },
  {
    id: "managed-servers",
    title: "Configuring Managed Servers",
    content: `Managed Servers host your applications and are managed by the Administration Server.

**Create Managed Server via Admin Console:**

**Step 1: Login to Admin Console**
- URL: http://hostname:7001/console
- Login with admin credentials

**Step 2: Navigate to Servers**
- Environment > Servers
- Click "New" button

**Step 3: Configure Server:**
- Name: ManagedServer1
- Listen Address: hostname (or IP address)
- Listen Port: 8001
- SSL Listen Port: 8002
- Click "Finish"

**Step 4: Additional Configuration:**
- Configuration > General: Set server name and ports
- Configuration > Server Start: Set arguments and classpath
- Configuration > Logging: Configure log settings
- Configuration > Tuning: Set thread pools

**Create Multiple Managed Servers:**
Repeat the process with different names and ports:
- ManagedServer1: 8001
- ManagedServer2: 8002
- ManagedServer3: 8003

**Start Managed Server:**
\`\`\`bash
cd /u01/oracle/domains/base_domain/bin

# Start with admin URL
./startManagedWebLogic.sh ManagedServer1 http://adminhost:7001

# Or using Node Manager (recommended)
# First, start Node Manager
./startNodeManager.sh &

# Then start managed server through Admin Console
\`\`\`

**Node Manager Configuration:**

**1. Configure Node Manager:**
\`\`\`bash
# Edit nodemanager.properties
cd /u01/oracle/domains/base_domain/nodemanager
vi nodemanager.properties

# Key settings:
ListenAddress=0.0.0.0
ListenPort=5556
SecureListener=true
AuthenticationEnabled=true
\`\`\`

**2. Start Node Manager:**
\`\`\`bash
cd /u01/oracle/domains/base_domain/bin
nohup ./startNodeManager.sh > nm.out 2>&1 &
\`\`\`

**3. Configure Machine in Admin Console:**
- Environment > Machines > New
- Name: Machine1
- Machine OS: Unix
- Node Manager Listen Address: hostname
- Node Manager Listen Port: 5556

**4. Assign Servers to Machine:**
- Environment > Servers > [Select Server]
- Configuration > General
- Machine: Select Machine1
- Save

**Remote Start Managed Servers:**
Now you can start/stop managed servers remotely through Admin Console:
- Environment > Servers > Control
- Select server(s)
- Click Start/Stop`
  },
  {
    id: "cluster",
    title: "Setting Up WebLogic Clusters",
    content: `Clusters provide high availability, scalability, and load balancing for your applications.

**Cluster Benefits:**
- High availability through failover
- Load distribution across servers
- Scalability by adding servers
- Session replication
- Improved performance

**Create a Cluster:**

**Step 1: Admin Console Navigation**
- Environment > Clusters
- Click "New"

**Step 2: Configure Cluster:**
- Cluster Name: AppCluster
- Messaging Mode: Unicast (recommended for most deployments)
- Multicast Address: (only if using multicast)
- Cluster Address: Leave blank for auto-configuration
- Frontend Host: loadbalancer.company.com
- Frontend HTTP Port: 80
- Frontend HTTPS Port: 443

**Step 3: Advanced Settings:**
- Configuration > Replication
  - WebLogic Servlet Session Replication: Enabled
  - Replication Channel: Cluster
- Configuration > Migration
  - Migration Basis: Database or Consensus
  - Data Source for Leasing: (if using database)

**Add Managed Servers to Cluster:**

**Method 1: Existing Servers**
- Environment > Servers > [Select Server]
- Configuration > General
- Cluster: Select AppCluster from dropdown
- Save and activate changes
- Restart the server

**Method 2: Create New Clustered Servers**
- Environment > Servers > New
- Name: ClusterMS1
- Listen Port: 8001
- Cluster: AppCluster
- Machine: Machine1

**Cluster Configuration Best Practices:**

**1. Minimum Servers:**
- Use at least 2 managed servers for redundancy
- Distribute across different machines/hosts
- Consider datacenter distribution

**2. Server Configuration:**
- Use consistent configuration across cluster members
- Same application versions
- Same JDBC data sources
- Same JVM parameters

**3. Session Replication:**
Configure in weblogic.xml:
\`\`\`xml
<session-descriptor>
  <persistent-store-type>replicated</persistent-store-type>
  <persistent-store-cookie-name>JSESSIONID</persistent-store-cookie-name>
</session-descriptor>
\`\`\`

**4. Load Balancing:**

**Hardware Load Balancer:**
- F5 BIG-IP
- Citrix NetScaler
- HAProxy

**Software Load Balancer:**
- Apache HTTP Server with mod_wl
- Oracle HTTP Server (OHS)
- Nginx with proxy

**5. Health Checks:**
Configure health check endpoint:
\`\`\`
URL: /health
Method: GET
Expected Response: 200 OK
Interval: 10 seconds
Timeout: 5 seconds
\`\`\`

**Cluster Communication:**

**Unicast Configuration (Recommended):**
- Automatic peer discovery
- No multicast required
- Better for cloud environments
- More reliable

**Multicast Configuration:**
- Requires multicast-enabled network
- Configure multicast address and port
- Test multicast: mcast-test utility

**Testing Cluster:**
\`\`\`bash
# Deploy test application to cluster
# Shut down one server
# Verify application still accessible
# Check session persistence
# Monitor cluster health in console
\`\`\``
  },
  {
    id: "jdbc",
    title: "JDBC Data Source Configuration",
    content: `WebLogic JDBC data sources provide database connectivity for your applications.

**Create JDBC Data Source:**

**Step 1: Admin Console Navigation**
- Services > Data Sources
- Click "New" > "Generic Data Source"

**Step 2: JDBC Data Source Properties:**
- Name: myDataSource
- JNDI Name: jdbc/myDS
- Database Type: Select (Oracle, MySQL, PostgreSQL, SQL Server, DB2)
- Database Driver: Choose appropriate driver

**Step 3: Driver Selection:**

**Oracle:**
- Driver: Oracle's Driver (Thin) for Instance connections
- Class: oracle.jdbc.OracleDriver

**MySQL:**
- Driver: MySQL Driver (Type 4)
- Class: com.mysql.jdbc.Driver

**PostgreSQL:**
- Driver: PostgreSQL Driver
- Class: org.postgresql.Driver

**Step 4: Connection Properties:**

**For Oracle:**
\`\`\`
Database Name: ORCL
Host Name: dbserver.company.com
Port: 1521
Database User Name: appuser
Password: ********
Confirm Password: ********
\`\`\`

**For MySQL:**
\`\`\`
Database Name: myappdb
Host Name: mysqlserver.company.com
Port: 3306
Database User Name: appuser
Password: ********
\`\`\`

**Step 5: Test Configuration:**
- Click "Test Configuration"
- Verify "Connection test succeeded"
- If failed, check credentials and network connectivity

**Step 6: Select Targets:**
- Choose servers or clusters to target
- Select: AppCluster (or individual servers)
- Click "Finish"

**JDBC Connection Pool Settings:**

**Configuration > Connection Pool:**
\`\`\`
Initial Capacity: 5
Maximum Capacity: 50
Capacity Increment: 5
Statement Cache Size: 10
Test Frequency: 120 seconds

Test Connections On Reserve: Enabled
Seconds to Trust an Idle Pool Connection: 10
Shrink Frequency: 900 seconds
Highest Num Waiters: 2147483647
Connection Creation Retry Frequency: 0
Login Delay: 0
\`\`\`

**Advanced Configuration:**

**Test Connection Settings:**
- Test Table Name: SQL SELECT 1 FROM DUAL (Oracle) or SELECT 1 (MySQL)
- Test Connections on Reserve: Enabled
- Test Frequency: 120 seconds

**Connection Leak Detection:**
\`\`\`
Inactive Connection Timeout: 900 seconds
Connection Reserve Timeout: 60 seconds
Remove Infected Connections: Enabled
\`\`\`

**Sample JDBC URLs:**

**Oracle:**
\`\`\`
# Basic connection
jdbc:oracle:thin:@hostname:1521:ORCL

# RAC connection
jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=rac1)(PORT=1521))(ADDRESS=(PROTOCOL=TCP)(HOST=rac2)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=myservice)))

# SSL connection
jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(PROTOCOL=tcps)(HOST=hostname)(PORT=2484))(CONNECT_DATA=(SERVICE_NAME=myservice)))
\`\`\`

**MySQL:**
\`\`\`
jdbc:mysql://hostname:3306/database?useSSL=false
jdbc:mysql://hostname:3306/database?useSSL=true&requireSSL=true
\`\`\`

**PostgreSQL:**
\`\`\`
jdbc:postgresql://hostname:5432/database
jdbc:postgresql://hostname:5432/database?ssl=true
\`\`\`

**Multi Data Sources (Failover):**

**Step 1: Create Multiple Data Sources**
- Create primary data source: myDS1
- Create secondary data source: myDS2
- Point to different database instances

**Step 2: Create Multi Data Source:**
- Services > Data Sources > New > Multi Data Source
- Name: myMultiDS
- JNDI Name: jdbc/myMultiDS
- Algorithm: Failover or Load-Balancing

**Step 3: Add Data Sources:**
- Add myDS1 (primary)
- Add myDS2 (secondary)
- Set priority order

**Step 4: Target:**
- Select servers/clusters
- Deploy

**Using Data Source in Application:**
\`\`\`java
Context ctx = new InitialContext();
DataSource ds = (DataSource) ctx.lookup("jdbc/myDS");
Connection conn = ds.getConnection();
// Use connection
conn.close();
\`\`\``
  },
  {
    id: "deployment",
    title: "Application Deployment",
    content: `Deploy Java EE applications (WAR, EAR, JAR) to WebLogic Server.

**Deployment Methods:**

**1. Admin Console Deployment:**

**Step 1: Navigate to Deployments**
- Deployments > Install
- Click "Upload your file(s)"

**Step 2: Select Application**
- Browse and select .war, .ear, or .jar file
- Click "Next"

**Step 3: Installation Type:**
- Install this deployment as an application
- Click "Next"

**Step 4: Choose Targets:**
- Select servers or clusters
- Example: AppCluster

**Step 5: Deployment Settings:**
- Name: myapp
- Security: Default
- Source Accessibility: Use default
- Deployment Plan: None (or specify)

**Step 6: Deploy:**
- Select "No, I will review the configuration later"
- Click "Finish"

**2. Command Line Deployment (WLST):**

**Connect and Deploy:**
\`\`\`python
# Start WLST
cd $WLS_HOME/common/bin
./wlst.sh

# Connect to admin server
connect('weblogic','password','t3://hostname:7001')

# Deploy application
deploy('myapp','/path/to/myapp.war',targets='AppCluster',upload='true')

# Redeploy
redeploy('myapp','/path/to/myapp.war')

# Undeploy
undeploy('myapp')

# Start application
startApplication('myapp')

# Stop application
stopApplication('myapp')

disconnect()
exit()
\`\`\`

**3. Auto Deployment (Development Only):**
Copy application to autodeploy directory:
\`\`\`bash
cp myapp.war $DOMAIN_HOME/autodeploy/
\`\`\`

**Deployment Descriptors:**

**web.xml (Standard):**
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         version="3.1">
  <display-name>MyApp</display-name>
  
  <servlet>
    <servlet-name>MyServlet</servlet-name>
    <servlet-class>com.example.MyServlet</servlet-class>
  </servlet>
  
  <servlet-mapping>
    <servlet-name>MyServlet</servlet-name>
    <url-pattern>/myservlet</url-pattern>
  </servlet-mapping>
  
  <security-constraint>
    <web-resource-collection>
      <web-resource-name>Admin Pages</web-resource-name>
      <url-pattern>/admin/*</url-pattern>
    </web-resource-collection>
    <auth-constraint>
      <role-name>admin</role-name>
    </auth-constraint>
  </security-constraint>
</web-app>
\`\`\`

**weblogic.xml (WebLogic-specific):**
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<weblogic-web-app xmlns="http://xmlns.oracle.com/weblogic/weblogic-web-app">
  <context-root>/myapp</context-root>
  
  <session-descriptor>
    <timeout-secs>3600</timeout-secs>
    <persistent-store-type>replicated</persistent-store-type>
  </session-descriptor>
  
  <resource-description>
    <res-ref-name>jdbc/myDS</res-ref-name>
    <jndi-name>jdbc/myDS</jndi-name>
  </resource-description>
</weblogic-web-app>
\`\`\`

**Deployment Best Practices:**

**1. Staging Modes:**
- **Stage:** Copy files to target servers (production)
- **NoStage:** Use files from source location (development)
- **External_Stage:** Files pre-copied to targets

**2. Deployment Plans:**
Use deployment plans for environment-specific configuration:
\`\`\`bash
# Create deployment plan
java weblogic.PlanGenerator -original myapp.war -plan myapp-plan.xml
\`\`\`

**3. Production Deployment:**
- Always use production mode
- Test in development/staging first
- Use deployment plans for configuration
- Implement blue-green deployment
- Use rolling restart for zero downtime

**4. Rolling Restart:**
In Admin Console:
- Deployments > myapp > Control
- Select "Roll Out Deployment"
- Configure batch size and wait time

**5. Application Versioning:**
Deploy multiple versions:
\`\`\`python
deploy('myapp#v1','/path/to/myapp-v1.war')
deploy('myapp#v2','/path/to/myapp-v2.war')

# Retire old version
stopApplication('myapp#v1')
undeploy('myapp#v1')
\`\`\`

**Troubleshooting Deployment:**

**Common Issues:**
- ClassNotFoundException: Check classpath and libraries
- JNDI lookup failures: Verify resource naming
- Memory issues: Increase heap size
- Timeout: Increase deployment timeout

**Check Deployment Status:**
\`\`\`python
connect('weblogic','password','t3://hostname:7001')
domainRuntime()
cd('AppRuntimeStateRuntime/AppRuntimeStateRuntime')
print cmo.getCurrentState('myapp','AppCluster')
\`\`\``
  },
  {
    id: "security",
    title: "Security Configuration",
    content: `WebLogic Server provides comprehensive security features for authentication, authorization, and encryption.

**SSL/TLS Configuration:**

**Step 1: Create Keystore**
\`\`\`bash
# Generate keystore
keytool -genkey -alias serverkey -keyalg RSA -keysize 2048 \\
  -keystore identity.jks -storepass welcome1 \\
  -dname "CN=myserver.company.com,OU=IT,O=Company,L=City,ST=State,C=US"

# Create trust keystore
keytool -genkey -alias trustkey -keyalg RSA \\
  -keystore trust.jks -storepass welcome1

# Import CA certificate
keytool -importcert -alias cacert -file ca.crt \\
  -keystore trust.jks -storepass welcome1
\`\`\`

**Step 2: Configure in Admin Console:**
- Environment > Servers > [Server] > Configuration > Keystores
- Change: Click "Change"
- Keystores: Custom Identity and Custom Trust
- Identity Keystore: /path/to/identity.jks
- Identity Keystore Type: JKS
- Identity Keystore Passphrase: welcome1
- Trust Keystore: /path/to/trust.jks
- Trust Keystore Type: JKS
- Trust Keystore Passphrase: welcome1
- Save

**Step 3: Configure SSL:**
- Environment > Servers > [Server] > Configuration > SSL
- Private Key Alias: serverkey
- Private Key Passphrase: welcome1
- Confirm Private Key Passphrase: welcome1
- SSL Listen Port Enabled: true
- Save and restart server

**Security Realms:**

**Configure Authentication Provider:**
- Security Realms > myrealm > Providers > Authentication
- New > Select provider type

**LDAP Authentication:**
- Security Realms > myrealm > Providers > Authentication
- New > ActiveDirectoryAuthenticator (or LDAPAuthenticator)

**Configuration:**
\`\`\`
Name: MyLDAPAuthenticator
Control Flag: SUFFICIENT
Host: ldap.company.com
Port: 389 (or 636 for LDAPS)
Principal: CN=wlsadmin,DC=company,DC=com
Credential: ********
User Base DN: OU=Users,DC=company,DC=com
User Name Attribute: sAMAccountName
User Object Class: person
Group Base DN: OU=Groups,DC=company,DC=com
\`\`\`

**Role-Based Access Control (RBAC):**

**Define Security Roles in web.xml:**
\`\`\`xml
<security-role>
  <role-name>admin</role-name>
</security-role>
<security-role>
  <role-name>user</role-name>
</security-role>

<security-constraint>
  <web-resource-collection>
    <web-resource-name>Admin Pages</web-resource-name>
    <url-pattern>/admin/*</url-pattern>
  </web-resource-collection>
  <auth-constraint>
    <role-name>admin</role-name>
  </auth-constraint>
  <user-data-constraint>
    <transport-guarantee>CONFIDENTIAL</transport-guarantee>
  </user-data-constraint>
</security-constraint>
\`\`\`

**Map Roles in weblogic.xml:**
\`\`\`xml
<security-role-assignment>
  <role-name>admin</role-name>
  <principal-name>wlsadmin</principal-name>
  <principal-name>Administrators</principal-name>
</security-role-assignment>
\`\`\`

**Configure Authentication Methods:**
\`\`\`xml
<login-config>
  <auth-method>BASIC</auth-method>
  <realm-name>myrealm</realm-name>
</login-config>
\`\`\`

**Other auth methods:**
- FORM: Custom login page
- CLIENT-CERT: Certificate-based
- DIGEST: Encrypted basic auth

**Security Best Practices:**

**1. Change Default Passwords:**
- Admin console password
- Node Manager password
- Database passwords
- Keystore passwords

**2. Enable SSL:**
- All admin traffic
- Application traffic
- Database connections
- Internal cluster communication

**3. Use Strong Encryption:**
- TLS 1.2 or higher
- Strong cipher suites
- 2048-bit or 4096-bit keys

**4. Regular Updates:**
- Apply security patches
- Update WebLogic Server
- Update JDK
- Review security advisories

**5. Principle of Least Privilege:**
- Grant minimal required permissions
- Use role-based access control
- Regular access reviews
- Audit security changes

**6. Audit Logging:**
Security Realms > myrealm > Providers > Auditing
- Enable audit providers
- Configure audit severity levels
- Monitor audit logs

**7. Production Mode:**
Always run in production mode:
- Enhanced security
- Stricter validation
- No auto-deployment
- Better performance`
  },
  {
    id: "monitoring",
    title: "Monitoring and Management",
    content: `WebLogic provides comprehensive monitoring and management capabilities.

**Admin Console Monitoring:**

**Dashboard Overview:**
- Domain > Monitoring > Dashboard
- Shows domain-wide health
- Server status indicators
- Active alerts

**Server Monitoring:**
- Environment > Servers > [Server] > Monitoring
- Performance: Thread usage, heap memory
- Health: Server health state
- Active Execute Threads
- Queue Length
- Throughput

**Key Metrics to Monitor:**

**1. Server Health State:**
- RUNNING: Normal operation
- ADMIN: Administrative mode
- STARTING: Server starting
- SHUTTING_DOWN: Server stopping
- FAILED: Server failure
- UNKNOWN: Cannot determine state

**2. Thread Usage:**
- Execute Thread Total: Total threads
- Execute Thread Idle: Idle threads
- Hogging Threads: Stuck threads
- Queue Length: Pending requests

**3. JVM Memory:**
- Heap Free Current: Available heap
- Heap Size Current: Total heap
- Heap Free Percent: Percentage free
- GC Frequency: Collection frequency

**4. Connection Pools:**
Services > Data Sources > [DataSource] > Monitoring
- Active Connections Current
- Num Available: Available connections
- Num Unavailable: In-use connections
- Wait Seconds High: Max wait time
- Failures to Reconnect: Connection failures

**WebLogic Diagnostic Framework (WLDF):**

**Configure Diagnostic Module:**

**Step 1: Create Module**
- Diagnostics > Diagnostic Modules > New
- Name: MyDiagnosticModule

**Step 2: Configure Instrumentation:**
- Enabled: true
- Add instrumentation monitors

**Step 3: Configure Harvesting:**
- Harvested Types: Add types to collect
  - ServerRuntime
  - JVMRuntime
  - ThreadPoolRuntime
  - JDBCDataSourceRuntime
- Sample Period: 300000 (5 minutes)

**Step 4: Create Watches:**
- Add watch rules
- Example: Monitor heap memory
\`\`\`
Alarm Type: Log
Alarm Reset Period: 60000
Enabled: true
Rule Expression: wls:ServerRuntime[@Name='ManagedServer1']/JVMRuntime[@Name='ManagedServer1']/HeapFreePercent < 15
\`\`\`

**Step 5: Configure Actions:**
- SNMP Trap
- Email Notification
- Log Action
- Script Action

**WLST Monitoring Scripts:**

**Monitor JVM Memory:**
\`\`\`python
connect('weblogic','password','t3://hostname:7001')
serverRuntime()

# Navigate to JVMRuntime
cd('JVMRuntime/ManagedServer1')

# Print memory statistics
print 'Heap Free Current: ' + str(cmo.getHeapFreeCurrent())
print 'Heap Size Current: ' + str(cmo.getHeapSizeCurrent())
print 'Heap Free Percent: ' + str(cmo.getHeapFreePercent())

disconnect()
\`\`\`

**Monitor Thread Pools:**
\`\`\`python
connect('weblogic','password','t3://hostname:7001')
serverRuntime()
cd('ThreadPoolRuntime/ThreadPoolRuntime')

print 'Execute Thread Total: ' + str(cmo.getExecuteThreadTotalCount())
print 'Execute Thread Idle: ' + str(cmo.getExecuteThreadIdleCount())
print 'Hogging Thread Count: ' + str(cmo.getHoggingThreadCount())
print 'Queue Length: ' + str(cmo.getQueueLength())

disconnect()
\`\`\`

**Monitor JDBC Connections:**
\`\`\`python
connect('weblogic','password','t3://hostname:7001')
serverRuntime()
cd('JDBCServiceRuntime/ManagedServer1/JDBCDataSourceRuntimeMBeans/myDS')

print 'Active Connections: ' + str(cmo.getActiveConnectionsCurrentCount())
print 'Connection Pool Size: ' + str(cmo.getCurrCapacity())
print 'Num Available: ' + str(cmo.getNumAvailable())
print 'Wait Seconds High: ' + str(cmo.getWaitSecondsHigh())

disconnect()
\`\`\`

**Log Files:**

**Admin Server Logs:**
\`\`\`
$DOMAIN_HOME/servers/AdminServer/logs/AdminServer.log
$DOMAIN_HOME/servers/AdminServer/logs/AdminServer.out
$DOMAIN_HOME/servers/AdminServer/logs/access.log
\`\`\`

**Managed Server Logs:**
\`\`\`
$DOMAIN_HOME/servers/ManagedServer1/logs/ManagedServer1.log
$DOMAIN_HOME/servers/ManagedServer1/logs/ManagedServer1.out
$DOMAIN_HOME/servers/ManagedServer1/logs/access.log
\`\`\`

**Domain Log:**
\`\`\`
$DOMAIN_HOME/servers/AdminServer/logs/base_domain.log
\`\`\`

**Monitor Logs:**
\`\`\`bash
# Tail server log
tail -f $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.log

# Search for errors
grep -i error $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.log

# Monitor multiple logs
multitail $DOMAIN_HOME/servers/*/logs/*.log
\`\`\`

**External Monitoring Tools:**

**JMX Monitoring:**
- Enable JMX in server configuration
- Use tools like JConsole, VisualVM
- Connect to: service:jmx:t3://hostname:7001/jndi/weblogic.management.mbeanservers.runtime

**Third-Party Tools:**
- Grafana + Prometheus
- New Relic
- AppDynamics
- Dynatrace
- Nagios
- Zabbix`
  },
  {
    id: "troubleshooting",
    title: "Common Issues and Troubleshooting",
    content: `Comprehensive guide to troubleshooting common WebLogic Server issues.

**Server Won't Start:**

**Check Java Version:**
\`\`\`bash
java -version
# Verify compatible with WebLogic version
\`\`\`

**Check Port Availability:**
\`\`\`bash
netstat -an | grep 7001
lsof -i :7001
# Kill process if port in use
kill -9 <pid>
\`\`\`

**Review Server Logs:**
\`\`\`bash
cat $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.log
cat $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.out
\`\`\`

**Check Environment Variables:**
\`\`\`bash
echo $JAVA_HOME
echo $MW_HOME
echo $WLS_HOME
\`\`\`

**Verify Permissions:**
\`\`\`bash
ls -la $DOMAIN_HOME
# Ensure wlsadmin user owns domain directory
\`\`\`

**Out of Memory Errors:**

**Increase Heap Size:**
Edit $DOMAIN_HOME/bin/setDomainEnv.sh:
\`\`\`bash
USER_MEM_ARGS="-Xms1024m -Xmx2048m"
USER_MEM_ARGS="$USER_MEM_ARGS -XX:PermSize=256m -XX:MaxPermSize=512m"
\`\`\`

**Enable Heap Dump:**
\`\`\`bash
USER_MEM_ARGS="$USER_MEM_ARGS -XX:+HeapDumpOnOutOfMemoryError"
USER_MEM_ARGS="$USER_MEM_ARGS -XX:HeapDumpPath=/logs/heapdumps"
\`\`\`

**Analyze Heap Dump:**
\`\`\`bash
# Using jhat
jhat -J-Xmx1024m heapdump.hprof

# Using Eclipse MAT
# Import heapdump.hprof into Memory Analyzer
\`\`\`

**Stuck Threads:**

**Monitor Stuck Threads:**
Admin Console > Environment > Servers > [Server] > Monitoring > Threads
- Look for "Stuck Thread Count"

**Configure Stuck Thread Timeout:**
Admin Console > Environment > Servers > [Server] > Configuration > Tuning
- Stuck Thread Max Time: 600 seconds
- Stuck Thread Timer Interval: 60 seconds

**Generate Thread Dump:**
\`\`\`bash
# Send SIGQUIT to process
kill -3 <java_pid>

# Thread dump written to server .out file
cat $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.out
\`\`\`

**Analyze Thread Dump:**
Look for:
- BLOCKED threads
- Deadlocks
- Long-running operations
- Waiting threads

**Connection Pool Exhaustion:**

**Symptoms:**
- Application timeouts
- "Cannot get connection" errors
- High wait times

**Solutions:**

**1. Increase Pool Size:**
Services > Data Sources > [DataSource] > Configuration > Connection Pool
- Maximum Capacity: 50 (increase from default)

**2. Reduce Connection Timeout:**
- Connection Reserve Timeout: 30 seconds

**3. Enable Shrinking:**
- Shrink Frequency: 900 seconds

**4. Test Connections:**
- Test Connections On Reserve: true
- Test Frequency: 120 seconds

**5. Check for Leaks:**
\`\`\`java
// Always close connections in finally block
Connection conn = null;
try {
  conn = ds.getConnection();
  // Use connection
} finally {
  if (conn != null) {
    conn.close();
  }
}
\`\`\`

**Deployment Failures:**

**Check Application Structure:**
\`\`\`bash
jar -tf myapp.war
# Verify WEB-INF/web.xml exists
# Check WEB-INF/lib/ for dependencies
\`\`\`

**Verify Deployment Descriptors:**
\`\`\`bash
# Validate XML syntax
xmllint --noout WEB-INF/web.xml
xmllint --noout WEB-INF/weblogic.xml
\`\`\`

**Class Loading Issues:**
- Check for duplicate JARs
- Verify class loader hierarchy
- Use prefer-application-packages

**Check Deployment Logs:**
\`\`\`bash
grep -i "myapp" $DOMAIN_HOME/servers/AdminServer/logs/AdminServer.log
\`\`\`

**Performance Issues:**

**Enable Verbose GC:**
\`\`\`bash
USER_MEM_ARGS="$USER_MEM_ARGS -verbose:gc"
USER_MEM_ARGS="$USER_MEM_ARGS -XX:+PrintGCDetails"
USER_MEM_ARGS="$USER_MEM_ARGS -XX:+PrintGCTimeStamps"
USER_MEM_ARGS="$USER_MEM_ARGS -Xloggc:/logs/gc.log"
\`\`\`

**Profile Application:**
\`\`\`bash
# Enable profiling
-agentlib:hprof=cpu=samples,depth=10,interval=10,file=/logs/java.hprof
\`\`\`

**Check Slow Queries:**
- Enable JDBC debugging
- Review database execution plans
- Add database indexes

**Debug Mode:**

**Start Server in Debug Mode:**
\`\`\`bash
# Edit startWebLogic.sh
debugFlag="true"
DEBUG_PORT="8453"

# Or start with options
./startWebLogic.sh -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=8453
\`\`\`

**Useful Commands:**

**Thread Dump:**
\`\`\`bash
kill -3 <java_pid>
jstack <java_pid> > thread_dump.txt
\`\`\`

**Heap Dump:**
\`\`\`bash
jmap -dump:format=b,file=heap.bin <java_pid>
\`\`\`

**JVM Info:**
\`\`\`bash
jinfo <java_pid>
jstat -gcutil <java_pid> 1000
\`\`\`

**Network Diagnostics:**
\`\`\`bash
# Check open ports
netstat -tulpn | grep java

# Check connectivity
telnet adminserver 7001
curl -v http://adminserver:7001/console

# Monitor connections
watch -n 1 'netstat -an | grep ESTABLISHED | wc -l'
\`\`\`

**Log Analysis:**
\`\`\`bash
# Find errors
grep -i "error\|exception\|failed" AdminServer.log

# Count errors by type
grep -i "error" AdminServer.log | sort | uniq -c | sort -rn

# Monitor in real-time
tail -f AdminServer.log | grep -i "error\|warn"
\`\`\``
  },
  {
    id: "backup",
    title: "Backup and Recovery",
    content: `Comprehensive backup and recovery strategies for WebLogic Server.

**What to Backup:**

**1. Domain Directory:**
\`\`\`
$DOMAIN_HOME/
  ├── bin/
  ├── config/
  ├── servers/
  ├── nodemanager/
  └── autodeploy/
\`\`\`

**2. Application Deployments:**
- Application EAR/WAR files
- Deployment plans
- Application configuration

**3. Configuration Files:**
- config.xml
- boot.properties
- security configuration
- JDBC data source descriptors

**4. Security Files:**
- Keystores (identity.jks, trust.jks)
- SSL certificates
- Security realm data
- Embedded LDAP data

**5. Log Files (Optional):**
- Server logs for audit trail
- Access logs
- Diagnostic logs

**Backup Strategy:**

**Script-Based Backup:**
\`\`\`bash
#!/bin/bash
# backup_weblogic.sh

# Configuration
BACKUP_DIR=/backup/weblogic
DATE=$(date +%Y%m%d_%H%M%S)
DOMAIN_HOME=/u01/oracle/domains/base_domain
MW_HOME=/u01/oracle/middleware

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Stop managed servers (optional)
echo "Stopping managed servers..."
cd $DOMAIN_HOME/bin
./stopManagedWebLogic.sh ManagedServer1 http://adminhost:7001

# Backup domain
echo "Backing up domain..."
tar -czf $BACKUP_DIR/$DATE/domain_$DATE.tar.gz $DOMAIN_HOME

# Backup middleware home (optional)
echo "Backing up middleware..."
tar -czf $BACKUP_DIR/$DATE/middleware_$DATE.tar.gz \\
  --exclude='$MW_HOME/logs' \\
  $MW_HOME

# Backup database configuration
echo "Backing up database..."
# Your database backup commands here

# Start servers
echo "Starting managed servers..."
./startManagedWebLogic.sh ManagedServer1 http://adminhost:7001

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/$DATE"
\`\`\`

**Configuration Export Using WLST:**

**Export Domain Template:**
\`\`\`python
# export_domain.py
offline()
readDomain('/u01/oracle/domains/base_domain')
writeTemplate('/backup/domain_template_20250101.jar')
closeDomain()
exit()
\`\`\`

**Run Export:**
\`\`\`bash
cd $WLS_HOME/common/bin
./wlst.sh export_domain.py
\`\`\`

**Hot Backup (Without Stopping Servers):**
\`\`\`bash
#!/bin/bash
# hot_backup.sh

BACKUP_DIR=/backup/weblogic
DATE=$(date +%Y%m%d_%H%M%S)
DOMAIN_HOME=/u01/oracle/domains/base_domain

# Backup configuration
cp -r $DOMAIN_HOME/config $BACKUP_DIR/config_$DATE

# Backup security
cp -r $DOMAIN_HOME/security $BACKUP_DIR/security_$DATE

# Backup applications
cp -r $DOMAIN_HOME/applications $BACKUP_DIR/applications_$DATE

# Backup keystores
cp $DOMAIN_HOME/identity.jks $BACKUP_DIR/
cp $DOMAIN_HOME/trust.jks $BACKUP_DIR/

tar -czf $BACKUP_DIR/hotbackup_$DATE.tar.gz \\
  $BACKUP_DIR/config_$DATE \\
  $BACKUP_DIR/security_$DATE \\
  $BACKUP_DIR/applications_$DATE \\
  $BACKUP_DIR/*.jks

# Cleanup temporary files
rm -rf $BACKUP_DIR/config_$DATE
rm -rf $BACKUP_DIR/security_$DATE
rm -rf $BACKUP_DIR/applications_$DATE
\`\`\`

**Recovery Procedures:**

**Full Domain Restore:**
\`\`\`bash
#!/bin/bash
# restore_domain.sh

BACKUP_FILE=/backup/weblogic/20250101_120000/domain_20250101_120000.tar.gz
DOMAIN_HOME=/u01/oracle/domains/base_domain

# Stop all servers
cd $DOMAIN_HOME/bin
./stopWebLogic.sh
./stopManagedWebLogic.sh ManagedServer1

# Backup current domain (safety)
mv $DOMAIN_HOME $DOMAIN_HOME.old

# Extract backup
tar -xzf $BACKUP_FILE -C /u01/oracle/domains/

# Verify permissions
chown -R wlsadmin:wlsadmin $DOMAIN_HOME

# Start admin server
cd $DOMAIN_HOME/bin
./startWebLogic.sh
\`\`\`

**Selective Restore:**
\`\`\`bash
# Restore only configuration
tar -xzf backup.tar.gz --strip-components=3 -C $DOMAIN_HOME/config base_domain/config/

# Restore only security
tar -xzf backup.tar.gz --strip-components=3 -C $DOMAIN_HOME/security base_domain/security/

# Restore specific application
tar -xzf backup.tar.gz --strip-components=4 -C $DOMAIN_HOME/applications \\
  base_domain/applications/myapp.war
\`\`\`

**Pack and Unpack for Migration:**

**Pack Domain:**
\`\`\`bash
cd $WLS_HOME/common/bin

# Pack managed server template
./pack.sh \\
  -domain=/u01/oracle/domains/base_domain \\
  -template=/backup/managed_template.jar \\
  -managed=true \\
  -template_name="Managed Server Template"

# Pack complete domain
./pack.sh \\
  -domain=/u01/oracle/domains/base_domain \\
  -template=/backup/domain_template.jar
\`\`\`

**Unpack on Target Server:**
\`\`\`bash
cd $WLS_HOME/common/bin

# Unpack domain
./unpack.sh \\
  -domain=/u01/oracle/domains/base_domain \\
  -template=/backup/domain_template.jar \\
  -app_dir=/u01/oracle/applications

# Unpack managed server template
./unpack.sh \\
  -domain=/u01/oracle/domains/base_domain \\
  -template=/backup/managed_template.jar
\`\`\`

**Disaster Recovery:**

**DR Checklist:**
1. Document all server configurations
2. Maintain off-site backups
3. Test recovery procedures quarterly
4. Keep installation media accessible
5. Document custom configurations
6. Maintain network diagrams
7. Document integration points

**DR Site Setup:**
1. Install same WebLogic version
2. Restore domain from backup
3. Update server addresses
4. Reconfigure load balancers
5. Update DNS entries
6. Test application functionality

**Automated Backup with Cron:**
\`\`\`bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /scripts/backup_weblogic.sh > /logs/backup.log 2>&1

# Weekly full backup on Sunday 3 AM
0 3 * * 0 /scripts/full_backup_weblogic.sh > /logs/full_backup.log 2>&1
\`\`\`

**Backup Verification:**
\`\`\`bash
#!/bin/bash
# verify_backup.sh

BACKUP_FILE=$1

# Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found"
  exit 1
fi

# Test extraction
tar -tzf $BACKUP_FILE > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup file is valid"
else
  echo "Backup file is corrupted"
  exit 1
fi

# Check size
SIZE=$(du -sh $BACKUP_FILE | cut -f1)
echo "Backup size: $SIZE"
\`\`\``
  }
];

export const WebLogicDocs = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="h-[calc(100vh-12rem)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <Card className="h-full rounded-none border-0 border-r">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Table of Contents</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  WebLogic Server 12 on Rocky Linux 9.6
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <nav className="p-2">
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors flex items-center justify-between group ${
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono ${
                          activeSection === section.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium">{section.title}</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        activeSection === section.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                      }`} />
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={75}>
          <Card className="h-full rounded-none border-0">
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="p-8 max-w-4xl">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">{currentSection.title}</h1>
                    <div className="h-1 w-20 bg-primary rounded"></div>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {currentSection.content.split('\n\n').map((paragraph, idx) => {
                      // Handle code blocks
                      if (paragraph.startsWith('```')) {
                        const codeMatch = paragraph.match(/```(\w+)?\n([\s\S]*?)```/);
                        if (codeMatch) {
                          const code = codeMatch[2];
                          return (
                            <pre key={idx} className="bg-muted p-4 rounded-lg overflow-x-auto border">
                              <code className="text-sm">{code}</code>
                            </pre>
                          );
                        }
                      }
                      
                      // Handle inline code
                      if (paragraph.includes('`')) {
                        const parts = paragraph.split(/(`[^`]+`)/g);
                        return (
                          <p key={idx} className="mb-4 leading-relaxed">
                            {parts.map((part, i) => {
                              if (part.startsWith('`') && part.endsWith('`')) {
                                return (
                                  <code key={i} className="bg-muted px-2 py-1 rounded text-sm">
                                    {part.slice(1, -1)}
                                  </code>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </p>
                        );
                      }
                      
                      // Handle headers
                      if (paragraph.startsWith('**') && paragraph.endsWith(':**')) {
                        return (
                          <h3 key={idx} className="text-xl font-semibold mt-6 mb-3">
                            {paragraph.slice(2, -3)}
                          </h3>
                        );
                      }
                      
                      // Handle bold text
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <h4 key={idx} className="text-lg font-semibold mt-4 mb-2">
                            {paragraph.slice(2, -2)}
                          </h4>
                        );
                      }
                      
                      // Handle lists
                      if (paragraph.startsWith('-') || paragraph.startsWith('•')) {
                        const items = paragraph.split('\n');
                        return (
                          <ul key={idx} className="list-disc list-inside mb-4 space-y-2">
                            {items.map((item, i) => (
                              <li key={i} className="leading-relaxed">
                                {item.replace(/^[-•]\s*/, '')}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      
                      // Regular paragraph
                      return (
                        <p key={idx} className="mb-4 leading-relaxed text-foreground/90">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
