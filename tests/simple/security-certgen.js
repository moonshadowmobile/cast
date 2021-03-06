/*
 * Licensed to Cloudkick, Inc ('Cloudkick') under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * Cloudkick licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fs =  require('fs');
var path = require('path');
var exec = require('child_process').exec;

var async = require('async');
var sprintf = require('sprintf').sprintf;

var certgen = require('security/certgen');
var misc = require('util/misc');

exports['setUp'] = function(test, assert) {
  fs.mkdir('.tests/certs', 0700, test.finish);
};

exports['test_openssl_cert_generation'] = function(test, assert) {
  var hostname = 'testhostnamerare' + misc.randstr(5);
  var keypath = '.tests/certs/t.key';
  var crtpath = '.tests/certs/t.crt';
  var options = {hostname: hostname};
  certgen.genSelfSigned(keypath, crtpath, options, function(err) {
    assert.ifError(err);
    exec('openssl x509 -noout -subject -in .tests/certs/t.crt', function(err, stdout, stderr) {
      assert.ifError(err);
      assert.equal('subject= /CN=' + hostname, misc.trim(stdout));
      test.finish();
    });
  });
};

exports['test_openssl_key_generation'] = function(test, assert) {
  var keypath = '.tests/certs/t2.key';
  certgen.genKey(keypath, function(err) {
    assert.ifError(err);
    fs.readFile(keypath, 'utf8', function(err, text) {
      assert.ifError(err);
      assert.match(text, /BEGIN RSA PRIVATE KEY/);
      assert.match(text, /END RSA PRIVATE KEY/);
      test.finish();
    });
  });
};

exports['test_openssl_csr_generation_verification'] = function(test, assert) {
  var keypath = '.tests/certs/t3.key';
  var csrpath = '.tests/certs/t3.csr';
  var opts = {
    hostname: 'foo.example.com'
  };
  var csrTxt;
  async.series([
    async.apply(certgen.genKey, keypath),

    async.apply(certgen.genCSR, keypath, csrpath, opts),

    // Sanity check the CSR
    function(callback) {
      fs.readFile(csrpath, 'utf8', function(err, csr) {
        assert.ifError(err);
        assert.match(csr, /BEGIN CERTIFICATE REQUEST/);
        assert.match(csr, /END CERTIFICATE REQUEST/);
        csrTxt = csr;
        callback();
      });
    },

    // Verify the CSR
    async.apply(certgen.verifyCSR, csrpath),

    // FUBAR the CSR
    function(callback) {
      // Increment the 100th character by 1 unicode value
      var code = csrTxt.charCodeAt(100) + 1;
      var newTxt = csrTxt.slice(0, 100) + String.fromCharCode(code) +
                      csrTxt.slice(101);
      fs.writeFile(csrpath, newTxt, callback);
    },

    // Ensure CSR verification now fails
    function(callback) {
      certgen.verifyCSR(csrpath, function(err) {
        assert.ok(err);
        callback();
      });
    }
  ],

  function(err) {
    assert.ifError(err);
    test.finish();
  });
};

exports['tests_openssl_ca_functionality'] = function(test, assert) {
  var cadir = '.tests/ca';
  var cakey = path.join(cadir, 'ca.key');
  var cacert = path.join(cadir, 'ca.crt');
  var casrl = path.join(cadir, 'ca.srl');
  var caopts = {
    hostname: 'ca.example.com'
  };
  var clientkey = path.join(cadir, 'client.key');
  var clientcsr = path.join(cadir, 'client.csr');
  var clientcert = path.join(cadir, 'client.crt');
  var clientopts = {
    hostname: 'client.example.com',
    email: 'foouser@example.com'
  };
  async.series([
    // Prepare CA directory
    async.apply(fs.mkdir, cadir, 0700),

    // Generate CA pair
    async.apply(certgen.genSelfSigned, cakey, cacert, caopts),

    // Initialize serial counter
    async.apply(certgen.initSerialFile, casrl),

    // Generate client key
    async.apply(certgen.genKey, clientkey),

    // Genrate and save client CSR
    async.apply(certgen.genCSR, clientkey, clientcsr, clientopts),

    // Sign client CSR
    async.apply(certgen.signCSR, clientcsr, cacert, cakey, casrl, clientcert),

    // Simple regex checking on generated certificate
    function(callback) {
      fs.readFile(clientcert, 'utf8', function(err, cert) {
        assert.ifError(err);
        assert.match(cert, /BEGIN CERTIFICATE/);
        assert.match(cert, /END CERTIFICATE/);
        callback();
      });
    },

    // Verify certificate was signed properly
    function(callback) {
      var cmdpat = 'openssl verify -CAfile %s -verbose %s';
      exec(sprintf(cmdpat, cacert, clientcert), function(err, stdout, stderr) {
        assert.ifError(err);
        assert.match(stdout, /OK/);
        assert.ok(!stderr);
        callback();
      });
    },

    // Verify various properties of the certificate
    function(callback) {
      var cmdpat = 'openssl x509 -subject -issuer -email -serial -in %s -noout';
      exec(sprintf(cmdpat, clientcert), function(err, stdout, stderr) {
        assert.ifError(err);
        assert.match(stdout, /subject.*CN=client\.example\.com/);
        assert.match(stdout, /subject.*emailAddress=foouser@example\.com/);
        assert.match(stdout, /issuer.*CN=ca\.example\.com/);
        assert.match(stdout, /serial=01/);
        callback();
      });
    }
  ],

  function(err) {
    assert.ifError(err);
    test.finish();
  });
};

exports['test_openssl_certificate_fingerprint'] = function(test, assert) {
  var certPath = path.join(process.cwd(), 'data', 'test.crt');
  var badPath = path.join(process.cwd(), 'data', 'nonexistant.crt');

  // Known fingerprint of the test cert
  var EXPECTED = '16:CE:B3:43:3E:CC:C2:AA:D3:43:37:CA:52:B4:3E:37:3A:23:59:B0';

  certgen.getCertFingerprint(certPath, function(err, fingerprint) {
    assert.ifError(err);
    assert.equal(fingerprint, EXPECTED);
  });

  certgen.getCertFingerprint(badPath, function(err, fingerprint) {
    assert.ok(err);
    test.finish();
  });
};
