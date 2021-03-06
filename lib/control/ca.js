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

var sys = require('sys');

var agentManagers = require('cast-agent/managers');
var jobs = require('jobs');
var ca = require('security/ca');


/**
 * Create a CSR with a given name and body.
 * @extends {jobs.Job}
 * @param {String} name The name of the CSR.
 * @param {String} csrText The text of the CSR.
 */
function CreateRequestJob(name, csrText) {
  jobs.Job.call(this, [csrText]);
  this.options = jobs.JobOptions.CREATE;
  this.resourceName = name;
  this.resourceType = ca.SigningRequest;
}

sys.inherits(CreateRequestJob, jobs.Job);


/**
 * Create the CSR.
 * @param {security.ca.SigningRequest} request The request resource.
 * @param {String} csrText The text of the CSR.
 * @param {Function} callback A callback fired with (err).
 */
CreateRequestJob.prototype.run = function(request, csrText, callback) {
  request.create(csrText, callback);
};


/**
 * Sign a CSR.
 * @extends {jobs.Job}
 * @param {String} name The name of the CSR to sign.
 * @param {Boolean} overwrite Should an existing certificate be overwritten?
 */
function SignRequestJob(name, overwrite) {
  jobs.Job.call(this, [overwrite]);
  this.options = jobs.JobOptions.UPDATE;
  this.resourceName = name;
  this.resourceType = ca.SigningRequest;
}

sys.inherits(SignRequestJob, jobs.Job);


/**
 * Sign the CSR.
 * @param {security.ca.SigningRequest} request The request resource.
 * @param {Boolean} overwrite Should an existing certificate be overwritten?
 * @param {Function} callback A callback fired with (err).
 */
SignRequestJob.prototype.run = function(request, overwrite, callback) {
  request.sign(overwrite, callback);
};


/**
 * Delete an unsigned CSR.
 * @extends {jobs.Job}
 * @param {String} name The name of the CSR to delete.
 */
function DeleteRequestJob(name) {
  jobs.Job.call(this);
  this.options = jobs.JobOptions.DELETE;
  this.resourceName = name;
  this.resourceType = ca.SigningRequest;
}

sys.inherits(DeleteRequestJob, jobs.Job);


DeleteRequestJob.prototype.run = function(request, callback) {
  request.destroy(callback);
};


/**
 * Retrieve a signing request by name.
 * @param {String} name The name of the CSR to retrieve.
 * @param {FUnction} callback A callback fired with (err, req).
 */
function getRequest(name, callback) {
  agentManagers.getManager('SigningRequestManager').get(name, callback);
}


/**
 * Retrieve a list of signing requests.
 * @param {Function} callback A callback fired with (err, reqList).
 */
function listRequests(callback) {
  agentManagers.getManager('SigningRequestManager').list(callback);
}


/**
 * Create a new CSR with the specified name and text.
 * @export
 * @param {String} name The name for the CSR.
 * @param {String} csrText The text of the CSR.
 * @return {jobs.Job} The job.
 */
function createRequest(name, csrText) {
  var j = new CreateRequestJob(name, csrText);
  agentManagers.getJobManager().run(j);
  return j;
}


/**
 * Sign the CSR with the specified name.
 * @param {String} name The name of the CSR to sign.
 * @param {Boolean} overwrite Overwrite existing certificates?
 * @return {jobs.Job} The job.
 */
function signRequest(name, overwrite) {
  var j = new SignRequestJob(name, overwrite);
  agentManagers.getJobManager().run(j);
  return j;
}


/**
 * Delete the CSR with the specified name.
 * @param {String} name The name of the CSR.
 * @return {jobs.Job} The job.
 */
function deleteRequest(name) {
  var j = new DeleteRequestJob(name);
  agentManagers.getJobManager().run(j);
  return j;
}


exports.getRequest = getRequest;
exports.listRequests = listRequests;
exports.createRequest = createRequest;
exports.signRequest = signRequest;
exports.deleteRequest = deleteRequest;
