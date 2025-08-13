// Attack testing page
import React, { useState } from 'react';
import { AlertTriangle, Send, Shield, Code, Database, FileText, Terminal } from 'lucide-react';

const AttackLabPage: React.FC = () => {
  const [selectedAttack, setSelectedAttack] = useState('xss');
  const [payload, setPayload] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const attacks = [
    { id: 'xss', name: 'XSS', icon: <Code className="w-5 h-5" />, 
      sample: '<script>alert("XSS")</script>' },
    { id: 'sqli', name: 'SQL Injection', icon: <Database className="w-5 h-5" />,
      sample: "' OR '1'='1" },
    { id: 'lfi', name: 'Path Traversal', icon: <FileText className="w-5 h-5" />,
      sample: '../../../etc/passwd' },
    { id: 'rce', name: 'Command Injection', icon: <Terminal className="w-5 h-5" />,
      sample: 'ls -la' }
  ];

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vulnerable/${selectedAttack}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          input: payload,
          file: selectedAttack === 'lfi' ? payload : undefined,
          command: selectedAttack === 'rce' ? payload : undefined
        })
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ error: 'Request failed' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Attack Testing Lab
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test WAF protection against common attacks
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> This lab contains real attack payloads for testing purposes.
              Use only in controlled environments.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Attack Type
            </h2>
            <div className="space-y-2">
              {attacks.map(attack => (
                <button
                  key={attack.id}
                  onClick={() => {
                    setSelectedAttack(attack.id);
                    setPayload(attack.sample);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    selectedAttack === attack.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  } border`}
                >
                  {attack.icon}
                  <span className="ml-3 font-medium">{attack.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Test Payload
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payload Content
              </label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter attack payload..."
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading || !payload}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg
                       hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Attack
                </>
              )}
            </button>

            {response && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Response
                </h3>
                <div className={`p-4 rounded-lg ${
                  response.blocked 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                }`}>
                  {response.blocked && (
                    <div className="flex items-center text-green-700 dark:text-green-400 mb-2">
                      <Shield className="w-5 h-5 mr-2" />
                      <span className="font-medium">Attack Blocked by WAF</span>
                    </div>
                  )}
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackLabPage;