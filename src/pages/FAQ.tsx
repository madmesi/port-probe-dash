import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle } from "lucide-react";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: "cmdb-1",
    category: "CMDB Basics",
    question: "What is a Configuration Management Database (CMDB)?",
    answer: "A CMDB is a centralized repository that stores information about all IT infrastructure components (servers, applications, databases, network devices) and their relationships. It provides a single source of truth for configuration data, helping organizations manage their IT assets effectively."
  },
  {
    id: "cmdb-2",
    category: "CMDB Basics",
    question: "How do I add a new server to the CMDB?",
    answer: "Navigate to the Servers tab, and if you have admin privileges, click the 'Add Server' button. Fill in the required information including hostname, IP address, and select the appropriate server group. The server will be added to the inventory immediately."
  },
  {
    id: "cmdb-3",
    category: "CMDB Basics",
    question: "What are server groups and how do I use them?",
    answer: "Server groups allow you to organize servers by environment, function, or department. Admins can create groups from the Admin Area > Server Groups section. Groups help with filtering, permissions management, and network mapping visualization."
  },
  {
    id: "wls-1",
    category: "WebLogic Server",
    question: "What versions of WebLogic Server are supported on Rocky Linux 9.6?",
    answer: "WebLogic Server 12.2.1.x and higher are fully supported on Rocky Linux 9.6. We recommend using the latest patch set for optimal performance and security. Ensure you're using JDK 8 or JDK 11 as the runtime environment."
  },
  {
    id: "wls-2",
    category: "WebLogic Server",
    question: "How do I start a WebLogic managed server?",
    answer: "You can start a managed server using the startManagedWebLogic.sh script in the domain's bin directory. The recommended approach is to use Node Manager for remote start/stop capabilities. First start Node Manager with ./startNodeManager.sh, then use the Admin Console to control managed servers remotely."
  },
  {
    id: "wls-3",
    category: "WebLogic Server",
    question: "What is the difference between a domain and a cluster?",
    answer: "A domain is the basic administrative unit containing one Admin Server and zero or more Managed Servers. A cluster is a group of Managed Servers within a domain that work together to provide high availability, load balancing, and failover capabilities for your applications."
  },
  {
    id: "wls-4",
    category: "WebLogic Server",
    question: "How do I configure JDBC data sources?",
    answer: "In the Admin Console, navigate to Services > Data Sources > New > Generic Data Source. Configure the database connection properties, test the connection, and target the data source to your servers or clusters. Remember to place the JDBC driver JAR file in the domain's lib directory or server's lib directory."
  },
  {
    id: "wls-5",
    category: "WebLogic Server",
    question: "What is Node Manager and why do I need it?",
    answer: "Node Manager is a utility that enables you to remotely start, stop, and restart Administration and Managed Servers. It's essential for production environments as it allows you to control servers from the Admin Console without manual SSH access, and it can automatically restart failed servers."
  },
  {
    id: "ssl-1",
    category: "SSL Certificates",
    question: "How do I monitor SSL certificate expiration?",
    answer: "The SSL Certificates tab provides automatic monitoring of all registered certificates. You'll receive notifications when certificates are approaching expiration (30, 14, and 7 days before). Enable email notifications in your profile settings to receive alerts directly."
  },
  {
    id: "ssl-2",
    category: "SSL Certificates",
    question: "What happens if my SSL certificate expires?",
    answer: "Expired certificates will cause browsers to display security warnings and may prevent users from accessing your applications. The CMDB will mark expired certificates with a red status indicator. It's critical to renew certificates before expiration to avoid service disruptions."
  },
  {
    id: "ssl-3",
    category: "SSL Certificates",
    question: "How do I add a new SSL certificate to monitor?",
    answer: "Admin users can add SSL certificates from the SSL Certificates tab by clicking 'Add Certificate'. Enter the certificate domain name, issuer information, and expiration date. The system will automatically track the certificate and send notifications as expiration approaches."
  },
  {
    id: "ssl-4",
    category: "WebLogic Security",
    question: "How do I configure SSL/TLS in WebLogic Server?",
    answer: "First, create identity and trust keystores using the keytool utility. Then in the Admin Console, navigate to Environment > Servers > [Server] > Configuration > Keystores to configure the keystore locations. Finally, configure SSL settings under the SSL tab, specifying the private key alias and passphrase."
  },
  {
    id: "deploy-1",
    category: "Deployment",
    question: "What deployment methods does WebLogic support?",
    answer: "WebLogic supports three main deployment methods: 1) Admin Console deployment (GUI-based), 2) WLST scripting (automated/command-line), and 3) Auto-deployment (development mode only). For production, use Admin Console or WLST with proper deployment plans for environment-specific configuration."
  },
  {
    id: "deploy-2",
    category: "Deployment",
    question: "What is a deployment plan and when should I use one?",
    answer: "A deployment plan is an XML file that allows you to customize application configuration without modifying the original EAR/WAR file. Use deployment plans to configure environment-specific settings like data source JNDI names, context roots, and resource references when deploying across multiple environments."
  },
  {
    id: "monitor-1",
    category: "Monitoring",
    question: "What metrics should I monitor in production?",
    answer: "Critical metrics include: JVM heap memory usage, thread pool statistics (queue length, stuck threads), JDBC connection pool health (active connections, wait times), server health state, and application response times. Set up WLDF watches to alert on threshold violations."
  },
  {
    id: "monitor-2",
    category: "Monitoring",
    question: "How do I diagnose stuck threads?",
    answer: "Monitor stuck thread counts in the Admin Console under Server > Monitoring > Threads. When stuck threads occur, generate a thread dump using 'kill -3 <pid>' and analyze the dump to identify blocking operations. Common causes include database deadlocks, infinite loops, or synchronization issues."
  },
  {
    id: "monitor-3",
    category: "Monitoring",
    question: "What is WLDF and how do I use it?",
    answer: "WebLogic Diagnostic Framework (WLDF) is a monitoring and diagnostics suite. Create diagnostic modules to harvest metrics, configure watches to monitor threshold violations, and define actions (alerts, scripts) when conditions are met. It's essential for proactive production monitoring."
  },
  {
    id: "trouble-1",
    category: "Troubleshooting",
    question: "My server won't start. What should I check?",
    answer: "Check: 1) Port availability (netstat -an | grep 7001), 2) Java version compatibility, 3) Environment variables (JAVA_HOME, MW_HOME), 4) File permissions on domain directory, 5) Server logs in $DOMAIN_HOME/servers/[ServerName]/logs/ for specific error messages."
  },
  {
    id: "trouble-2",
    category: "Troubleshooting",
    question: "How do I resolve OutOfMemoryError?",
    answer: "Increase heap size in setDomainEnv.sh by modifying USER_MEM_ARGS (e.g., -Xmx2048m). Enable heap dumps with -XX:+HeapDumpOnOutOfMemoryError. Analyze heap dumps using tools like Eclipse MAT or jhat to identify memory leaks. Consider reviewing application code for inefficient memory usage."
  },
  {
    id: "trouble-3",
    category: "Troubleshooting",
    question: "Application deployment fails with ClassNotFoundException. What's wrong?",
    answer: "Common causes: 1) Missing library JAR files in APP-INF/lib (for EAR) or WEB-INF/lib (for WAR), 2) Incorrect classloader configuration, 3) Conflicting library versions. Check the deployment descriptor's prefer-application-packages setting and ensure all required libraries are packaged correctly."
  },
  {
    id: "security-1",
    category: "Security",
    question: "What are security best practices for WebLogic?",
    answer: "Key practices: 1) Always run in production mode, 2) Enable SSL for all admin and application traffic, 3) Change default passwords, 4) Use strong cipher suites, 5) Apply security patches regularly, 6) Implement RBAC with principle of least privilege, 7) Enable audit logging, 8) Use LDAP/AD for centralized authentication."
  },
  {
    id: "security-2",
    category: "Security",
    question: "How do I integrate WebLogic with LDAP/Active Directory?",
    answer: "In Admin Console, go to Security Realms > myrealm > Providers > Authentication > New. Select ActiveDirectoryAuthenticator or LDAPAuthenticator. Configure host, port, principal (bind DN), user/group base DNs, and object classes. Set Control Flag to SUFFICIENT and test authentication."
  },
  {
    id: "cluster-1",
    category: "Clustering",
    question: "What are the benefits of clustering?",
    answer: "Clustering provides: 1) High availability through automatic failover, 2) Load distribution across multiple servers, 3) Horizontal scalability by adding servers, 4) Session replication for stateful applications, 5) Zero-downtime deployments with rolling restart capability."
  },
  {
    id: "cluster-2",
    category: "Clustering",
    question: "How do I configure session replication?",
    answer: "In your application's weblogic.xml descriptor, configure the session-descriptor with persistent-store-type set to 'replicated'. In the Admin Console cluster configuration, ensure replication is enabled. The cluster must use unicast or multicast communication for replication to work."
  },
  {
    id: "perf-1",
    category: "Performance",
    question: "How can I improve WebLogic Server performance?",
    answer: "Optimization strategies: 1) Tune JVM heap and GC settings, 2) Optimize JDBC connection pool sizes, 3) Configure appropriate thread pool settings, 4) Enable HTTP response caching, 5) Use Work Managers for application prioritization, 6) Implement proper session management (avoid large session objects), 7) Use CDN for static content."
  },
  {
    id: "perf-2",
    category: "Performance",
    question: "What JVM parameters should I use for production?",
    answer: "Recommended settings: -Xms and -Xmx (same value for consistency, e.g., 4096m), -XX:+UseG1GC (or other modern GC), -XX:MaxGCPauseMillis=200, -XX:+HeapDumpOnOutOfMemoryError, -XX:HeapDumpPath=/logs/heapdumps. Adjust based on your application's memory profile and requirements."
  },
  {
    id: "backup-1",
    category: "Backup & Recovery",
    question: "What should I backup in my WebLogic environment?",
    answer: "Essential backups: 1) Domain directory ($DOMAIN_HOME), 2) Deployed applications (if not using external staging), 3) Keystores and certificates, 4) JDBC persistence stores (if applicable), 5) Database (application data), 6) Configuration files (especially if manually edited), 7) Deployment plans."
  },
  {
    id: "backup-2",
    category: "Backup & Recovery",
    question: "How do I perform a domain backup?",
    answer: "Shut down all servers in the domain, then use the WLST offline mode or simply copy the entire $DOMAIN_HOME directory to a backup location. For online backup (domain running), use export/import or WLST domainRuntime commands to export configuration. Store backups in a separate location with retention policy."
  },
  {
    id: "access-1",
    category: "Access & Permissions",
    question: "How do I request access to the CMDB?",
    answer: "Create an account through the login page. Your account will be pending approval until an administrator reviews and approves it. Once approved, you'll receive access to view servers and configurations based on your assigned role."
  },
  {
    id: "access-2",
    category: "Access & Permissions",
    question: "What's the difference between admin and regular user roles?",
    answer: "Regular users can view server information and monitoring data. Admin users have additional privileges: add/edit/delete servers, manage SSL certificates, create server groups, approve new user accounts, generate API keys, and access administrative functions."
  },
  {
    id: "api-1",
    category: "API Integration",
    question: "Can I integrate external systems with the CMDB?",
    answer: "Yes, admins can generate API keys from the Admin Area > API Keys tab. Use these keys for server-to-server authentication when sending data to the CMDB via REST API. This allows automated data ingestion from monitoring tools, configuration management systems, or custom scripts."
  },
  {
    id: "network-1",
    category: "Network Mapping",
    question: "What is the Network Mapping feature?",
    answer: "The Network Mapping tab visualizes your server infrastructure and relationships between servers within groups. It can also process network data files (tcpdump, netstat, lsof) to automatically discover connections and dependencies between systems."
  }
];

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs based on search query
  const filteredFAQs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group FAQs by category
  const categories = Array.from(new Set(faqData.map((faq) => faq.category)));

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-code-bg">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
              <p className="text-muted-foreground mt-2">
                Find answers to common questions about CMDB, WebLogic Server, SSL certificates, and more
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No FAQs found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryFAQs = filteredFAQs.filter((faq) => faq.category === category);
                
                if (categoryFAQs.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">{category}</h3>
                    <Accordion type="single" collapsible className="space-y-2">
                      {categoryFAQs.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={faq.id}
                          className="border border-border rounded-lg px-4 bg-card"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <span className="text-left font-medium">{faq.question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
            <p className="text-muted-foreground">
              Contact your system administrator for additional support or refer to the{" "}
              <span className="text-primary font-medium">WebLogic documentation</span> tab for detailed technical guides.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
