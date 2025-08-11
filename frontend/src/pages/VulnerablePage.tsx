import React, { useState } from 'react';
import { AlertTriangle, Shield, Code, Database, FileText, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { Link } from 'react-router-dom';

const VulnerablePage: React.FC = () => {
  const { state } = useAuth();
  const [xssInput, setXssInput] = useState('');
  const [sqlInput, setSqlInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  
  const [xssResult, setXssResult] = useState('');
  const [sqlResult, setSqlResult] = useState('');
  const [pathResult, setPathResult] = useState('');
  
  const [testingXSS, setTestingXSS] = useState(false);
  const [testingSQL, setTestingSQL] = useState(false);
  const [testingPath, setTestingPath] = useState(false);

  // File Upload Test State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPath, setUploadPath] = useState('');
  const [bypassValidation, setBypassValidation] = useState(false);
  const [customExtension, setCustomExtension] = useState('');
  const [fileUploadResult, setFileUploadResult] = useState('');
  const [testingFileUpload, setTestingFileUpload] = useState(false);
  const [fileListResult, setFileListResult] = useState('');
  const [directoryPath, setDirectoryPath] = useState('');

  // XSS Test Payloads
  const xssPayloads = [
    "<script>alert('XSS')</scr" + "ipt>",
    "<img src=\"x\" onerror=\"alert('XSS')\">",
    "<svg onload=\"alert(1)\">",
    "javascript:alert('XSS')",
    ">\"<script>alert('XSS')</scr" + "ipt>",
    "<iframe src=\"javascript:alert(1)\"></iframe>"
  ];

  // SQL Injection Payloads
  const sqlPayloads = [
    `' OR 1=1--`,
    `' OR 'a'='a`,
    `1' UNION SELECT NULL--`,
    `'; DROP TABLE users--`,
    `1' AND 1=1--`,
    `admin'--`
  ];

  // Path Traversal Payloads
  const pathPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '../../../../../../etc/shadow',
    '../../../var/log/apache2/access.log'
  ];

  const testXSS = async () => {
    if (!xssInput.trim()) return;

    setTestingXSS(true);
    const response = await apiClient.testXSS(xssInput);
    
    if (response.data) {
      setXssResult(JSON.stringify(response.data, null, 2));
    } else {
      setXssResult(`Error: ${response.error}`);
    }

    setTestingXSS(false);
  };

  const testSQLInjection = async () => {
    if (!sqlInput.trim()) return;

    setTestingSQL(true);
    const response = await apiClient.testSQLInjection(sqlInput);
    
    if (response.data) {
      setSqlResult(JSON.stringify(response.data, null, 2));
    } else {
      setSqlResult(`Error: ${response.error}`);
    }

    setTestingSQL(false);
  };

  const testPathTraversal = async () => {
    if (!pathInput.trim()) return;

    setTestingPath(true);
    const response = await apiClient.testPathTraversal(pathInput);
    
    if (response.data) {
      setPathResult(JSON.stringify(response.data, null, 2));
    } else {
      setPathResult(`Error: ${response.error}`);
    }

    setTestingPath(false);
  };

  const testFileUpload = async () => {
    if (!selectedFile) return;

    setTestingFileUpload(true);
    const options = {
      upload_path: uploadPath || undefined,
      bypass_validation: bypassValidation ? 'true' : 'false',
      custom_extension: customExtension || undefined,
    };

    const response = await apiClient.testFileUpload(selectedFile, options);
    
    if (response.data) {
      setFileUploadResult(JSON.stringify(response.data, null, 2));
    } else {
      setFileUploadResult(`Error: ${response.error}`);
    }

    setTestingFileUpload(false);
  };

  const testFileList = async () => {
    const response = await apiClient.testFileList(directoryPath || undefined);
    
    if (response.data) {
      setFileListResult(JSON.stringify(response.data, null, 2));
    } else {
      setFileListResult(`Error: ${response.error}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const setPayload = (type: string, payload: string) => {
    switch (type) {
      case 'xss':
        setXssInput(payload);
        break;
      case 'sql':
        setSqlInput(payload);
        break;
      case 'path':
        setPathInput(payload);
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-red-600" />
          WAF Vulnerability Testing
        </h1>
        <p className="text-gray-600 mt-2">Test various attack vectors against ModSecurity WAF rules</p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This testing environment is for educational purposes only. 
                These vulnerability tests are designed to validate WAF protection mechanisms.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!state.user ? (
        <div className="card">
          <div className="card-body text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please sign in to access vulnerability testing features.</p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-1">
          {/* XSS Testing Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Code className="h-6 w-6 mr-2 text-red-600" />
                Cross-Site Scripting (XSS) Testing
              </h2>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="xss-input" className="block text-sm font-medium text-gray-700 mb-2">
                    XSS Payload
                  </label>
                  <textarea
                    id="xss-input"
                    value={xssInput}
                    onChange={(e) => setXssInput(e.target.value)}
                    className="input-field"
                    rows={4}
                    placeholder="Enter XSS payload..."
                  />
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Sample payloads:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {xssPayloads.map((payload, index) => (
                        <button
                          key={index}
                          onClick={() => setPayload('xss', payload)}
                          className="text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded font-mono"
                        >
                          {payload}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={testXSS}
                    disabled={testingXSS || !xssInput.trim()}
                    className="btn-primary mt-4 disabled:opacity-50"
                  >
                    {testingXSS ? 'Testing...' : 'Test XSS'}
                  </button>
                </div>
                
                <div>
                  <label htmlFor="xss-response" className="block text-sm font-medium text-gray-700 mb-2">
                    Response
                  </label>
                  <pre id="xss-response" className="bg-gray-100 p-4 rounded text-xs overflow-auto h-64 font-mono">
                    {xssResult || 'No test results yet'}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* SQL Injection Testing Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Database className="h-6 w-6 mr-2 text-red-600" />
                SQL Injection Testing
              </h2>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="sql-input" className="block text-sm font-medium text-gray-700 mb-2">
                    SQL Injection Payload
                  </label>
                  <textarea
                    id="sql-input"
                    value={sqlInput}
                    onChange={(e) => setSqlInput(e.target.value)}
                    className="input-field"
                    rows={4}
                    placeholder="Enter SQL injection payload..."
                  />
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Sample payloads:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {sqlPayloads.map((payload, index) => (
                        <button
                          key={index}
                          onClick={() => setPayload('sql', payload)}
                          className="text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded font-mono"
                        >
                          {payload}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={testSQLInjection}
                    disabled={testingSQL || !sqlInput.trim()}
                    className="btn-primary mt-4 disabled:opacity-50"
                  >
                    {testingSQL ? 'Testing...' : 'Test SQL Injection'}
                  </button>
                </div>
                
                <div>
                  <label htmlFor="sql-response" className="block text-sm font-medium text-gray-700 mb-2">
                    Response
                  </label>
                  <pre id="sql-response" className="bg-gray-100 p-4 rounded text-xs overflow-auto h-64 font-mono">
                    {sqlResult || 'No test results yet'}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Path Traversal Testing Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-red-600" />
                Path Traversal Testing
              </h2>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="path-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Path Traversal Payload
                  </label>
                  <textarea
                    id="path-input"
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    className="input-field"
                    rows={4}
                    placeholder="Enter path traversal payload..."
                  />
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Sample payloads:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {pathPayloads.map((payload, index) => (
                        <button
                          key={index}
                          onClick={() => setPayload('path', payload)}
                          className="text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded font-mono"
                        >
                          {payload}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={testPathTraversal}
                    disabled={testingPath || !pathInput.trim()}
                    className="btn-primary mt-4 disabled:opacity-50"
                  >
                    {testingPath ? 'Testing...' : 'Test Path Traversal'}
                  </button>
                </div>
                
                <div>
                  <label htmlFor="path-response" className="block text-sm font-medium text-gray-700 mb-2">
                    Response
                  </label>
                  <pre id="path-response" className="bg-gray-100 p-4 rounded text-xs overflow-auto h-64 font-mono">
                    {pathResult || 'No test results yet'}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Testing Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Upload className="h-6 w-6 mr-2 text-red-600" />
                File Upload Testing
              </h2>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Select File
                      </label>
                      <input
                        type="file"
                        id="file-input"
                        onChange={handleFileSelect}
                        className="input-field"
                      />
                      {selectedFile && (
                        <p className="text-sm text-gray-600 mt-1">
                          Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="upload-path" className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Path (Path Traversal)
                      </label>
                      <input
                        type="text"
                        id="upload-path"
                        value={uploadPath}
                        onChange={(e) => setUploadPath(e.target.value)}
                        className="input-field"
                        placeholder="../../../tmp or admin/uploads"
                      />
                    </div>

                    <div>
                      <label htmlFor="custom-ext" className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Extension
                      </label>
                      <input
                        type="text"
                        id="custom-ext"
                        value={customExtension}
                        onChange={(e) => setCustomExtension(e.target.value)}
                        className="input-field"
                        placeholder=".php or .exe"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="bypass-validation"
                        checked={bypassValidation}
                        onChange={(e) => setBypassValidation(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="bypass-validation" className="text-sm text-gray-700">
                        Bypass Validation
                      </label>
                    </div>

                    <button
                      onClick={testFileUpload}
                      disabled={testingFileUpload || !selectedFile}
                      className="btn-primary disabled:opacity-50"
                    >
                      {testingFileUpload ? 'Uploading...' : 'Test File Upload'}
                    </button>

                    <div className="border-t pt-4">
                      <label htmlFor="directory-path" className="block text-sm font-medium text-gray-700 mb-2">
                        List Directory
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="directory-path"
                          value={directoryPath}
                          onChange={(e) => setDirectoryPath(e.target.value)}
                          className="input-field flex-1"
                          placeholder="../../../etc or admin"
                        />
                        <button
                          onClick={testFileList}
                          className="btn-secondary"
                        >
                          List Files
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response
                  </label>
                  <div className="space-y-4">
                    {fileUploadResult && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Upload Result:</h4>
                        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto h-32 font-mono">
                          {fileUploadResult}
                        </pre>
                      </div>
                    )}
                    {fileListResult && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">File List:</h4>
                        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto h-32 font-mono">
                          {fileListResult}
                        </pre>
                      </div>
                    )}
                    {!fileUploadResult && !fileListResult && (
                      <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto h-64 font-mono">
                        No test results yet
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VulnerablePage;
