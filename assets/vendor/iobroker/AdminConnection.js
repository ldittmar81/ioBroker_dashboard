import { Connection, ERRORS } from './Connection.js';
import { getObjectViewResultToArray, normalizeHostId, objectIdToHostname } from './tools.js';
function parseCertificate(name, cert) {
    if (!cert) {
        return;
    }
    let type;
    // If it is a filename, it could be everything
    if (cert.length < 700 && (cert.indexOf('/') !== -1 || cert.indexOf('\\') !== -1)) {
        if (name.toLowerCase().includes('private')) {
            type = 'private';
        }
        else if (cert.toLowerCase().includes('private')) {
            type = 'private';
        }
        else if (name.toLowerCase().includes('public')) {
            type = 'public';
        }
        else if (cert.toLowerCase().includes('public')) {
            type = 'public';
        }
        else if (name.toLowerCase().includes('chain')) {
            type = 'chained';
        }
        else if (cert.toLowerCase().includes('chain')) {
            type = 'chained';
        }
        else {
            // TODO: is this correct?
            return;
        }
    }
    else {
        type =
            cert.substring(0, '-----BEGIN RSA PRIVATE KEY'.length) === '-----BEGIN RSA PRIVATE KEY' ||
                cert.substring(0, '-----BEGIN PRIVATE KEY'.length) === '-----BEGIN PRIVATE KEY'
                ? 'private'
                : 'public';
        if (type === 'public') {
            const m = cert.split('-----END CERTIFICATE-----');
            if (m.filter(t => t.replace(/\r\n|\r|\n/, '').trim()).length > 1) {
                type = 'chained';
            }
        }
    }
    return { name, type };
}
function parseIPAddresses(host) {
    const IPs4 = [
        {
            name: '[IPv4] 0.0.0.0 - Listen on all IPs',
            address: '0.0.0.0',
            family: 'ipv4',
        },
    ];
    const IPs6 = [
        {
            name: '[IPv6] :: - Listen on all IPs',
            address: '::',
            family: 'ipv6',
        },
    ];
    if (host.native?.hardware?.networkInterfaces) {
        const list = host.native?.hardware?.networkInterfaces;
        Object.keys(list).forEach(inter => {
            list[inter].forEach(ip => {
                if (ip.family !== 'IPv6') {
                    IPs4.push({
                        name: `[${ip.family}] ${ip.address} - ${inter}`,
                        address: ip.address,
                        family: 'ipv4',
                    });
                }
                else {
                    IPs6.push({
                        name: `[${ip.family}] ${ip.address} - ${inter}`,
                        address: ip.address,
                        family: 'ipv6',
                    });
                }
            });
        });
    }
    return { IPs4, IPs6 };
}
export class AdminConnection extends Connection {
    constructor(props) {
        super(props);
    }
    // We overload the request method here because the admin connection's methods all have `requireAdmin: true`
    request(options) {
        return super.request({ requireAdmin: true, ...options });
    }
    /**
     * Get the stored certificates.
     *
     * @param update Force update.
     */
    getCertificates(update) {
        return this.request({
            cacheKey: 'cert',
            forceUpdate: update,
            // TODO: check if this should time out
            commandTimeout: false,
            executor: async (resolve) => {
                const obj = await this.getObject('system.certificates');
                if (obj?.native?.certificates) {
                    resolve(Object.entries(obj.native.certificates)
                        .map(([name, cert]) => parseCertificate(name, cert))
                        .filter((cert) => !!cert));
                }
                else {
                    resolve([]);
                }
            },
        });
    }
    /**
     * Get the logs from a host (only for admin connection).
     */
    getLogs(host, linesNumber = 200) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: resolve => {
                this._socket.emit('sendToHost', host, 'getLogs', linesNumber || 200, (lines) => {
                    resolve(lines);
                });
            },
        });
    }
    /**
     * Upgrade adapter with webserver.
     */
    upgradeAdapterWithWebserver(host, options) {
        return this.request({
            commandTimeout: false,
            executor: resolve => {
                this._socket.emit('sendToHost', host, 'upgradeAdapterWithWebserver', options, (result) => {
                    resolve(result);
                });
            },
        });
    }
    /**
     * Upgrade controller
     */
    upgradeController(host, version, adminInstance) {
        return this.request({
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('sendToHost', host, 'upgradeController', {
                    version,
                    adminInstance,
                }, (result) => {
                    const _result = result;
                    if (_result.error) {
                        reject(_result.error);
                    }
                    else {
                        resolve(_result.result);
                    }
                });
            },
        });
    }
    /**
     * Read licenses from ioBroker.net anew
     */
    updateLicenses(
    /** login for ioBroker.net */
    login, 
    /** password for ioBroker.net */
    password) {
        return this.request({
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('updateLicenses', login, password, (err, licenses) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(licenses);
                    }
                });
            },
        });
    }
    /**
     * Upgrade controller
     */
    upgradeOsPackages(host, packages, restart) {
        return this.request({
            commandTimeout: false,
            executor: resolve => {
                this._socket.emit('sendToHost', host, 'upgradeOsPackages', {
                    packages,
                    restart: !!restart,
                }, (result) => {
                    resolve(result);
                });
            },
        });
    }
    /**
     * Get the log files (only for admin connection).
     */
    getLogsFiles(host) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('readLogs', host, (err, files) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(files);
                });
            },
        });
    }
    /**
     * Delete the logs from a host (only for admin connection).
     */
    delLogs(host) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('sendToHost', host, 'delLogs', null, err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Delete a file of an adapter.
     *
     * @param adapter The adapter name.
     * @param fileName The file name.
     */
    deleteFile(adapter, fileName) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('deleteFile', adapter, fileName, err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Delete a folder of an adapter.
     *
     * @param adapter The adapter name.
     * @param folderName The folder name.
     */
    deleteFolder(adapter, folderName) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('deleteFolder', adapter, folderName, err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Rename file or folder in ioBroker DB
     *
     * @param adapter instance name
     * @param oldName current file name, e.g., main/vis-views.json
     * @param newName new file name, e.g., main/vis-views-new.json
     */
    rename(adapter, oldName, newName) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('rename', adapter, oldName, newName, err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Rename file in ioBroker DB
     *
     * @param adapter instance name
     * @param oldName current file name, e.g., main/vis-views.json
     * @param newName new file name, e.g., main/vis-views-new.json
     */
    renameFile(adapter, oldName, newName) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('renameFile', adapter, oldName, newName, err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Get the list of all hosts.
     *
     * @param update Force update.
     */
    getHosts(update) {
        return this.request({
            cacheKey: 'hosts',
            forceUpdate: update,
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('getObjectView', 'system', 'host', { startkey: 'system.host.', endkey: 'system.host.\u9999' }, (err, doc) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(getObjectViewResultToArray(doc));
                    }
                });
            },
        });
    }
    /**
     * Get the list of all users.
     *
     * @param update Force update.
     */
    getUsers(update) {
        return this.request({
            cacheKey: 'users',
            forceUpdate: update,
            // TODO: check if this should time out
            commandTimeout: false,
            executor: (resolve, reject) => {
                this._socket.emit('getObjectView', 'system', 'user', { startkey: 'system.user.', endkey: 'system.user.\u9999' }, (err, doc) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(getObjectViewResultToArray(doc));
                    }
                });
            },
        });
    }
    /**
     * Rename a group.
     *
     * @param id The id.
     * @param newId The new id.
     * @param newName The new name.
     */
    renameGroup(id, newId, newName) {
        return this.request({
            // TODO: check if this should time out
            commandTimeout: false,
            executor: async (resolve) => {
                const groups = await this.getGroups(true);
                // renaming a group happens by re-creating the object under a different ID
                const subGroups = groups.filter(g => g._id.startsWith(`${id}.`));
                // First, do this for all sub-groups
                for (const group of subGroups) {
                    const oldGroupId = group._id;
                    const newGroupId = (newId + group._id.substring(id.length));
                    group._id = newGroupId;
                    // Create a new object, then delete the old one if it worked
                    await this.setObject(newGroupId, group);
                    await this.delObject(oldGroupId);
                }
                // Then for the parent group
                const parentGroup = groups.find(g => g._id === id);
                if (parentGroup) {
                    const oldGroupId = parentGroup._id;
                    parentGroup._id = newId;
                    if (newName !== undefined) {
                        parentGroup.common ??= {};
                        parentGroup.common.name = newName;
                    }
                    // Create a new object, then delete the old one if it worked
                    await this.setObject(newId, parentGroup);
                    await this.delObject(oldGroupId);
                }
                resolve();
            },
        });
    }
    /**
     * Get the host information.
     *
     * @param host host name
     * @param update Force update.
     * @param timeoutMs optional read timeout.
     */
    getHostInfo(host, update, timeoutMs) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `hostInfo_${host}`,
            forceUpdate: update,
            commandTimeout: timeoutMs,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getHostInfo', null, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getHostInfo"');
                    }
                    else if (!data) {
                        reject('Cannot read "getHostInfo"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Get the host information (short version).
     *
     * @param host host name
     * @param update Force update.
     * @param timeoutMs optional read timeout.
     */
    getHostInfoShort(host, update, timeoutMs) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `hostInfoShort_${host}`,
            forceUpdate: update,
            commandTimeout: timeoutMs,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getHostInfoShort', null, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getHostInfoShort"');
                    }
                    else if (!data) {
                        reject('Cannot read "getHostInfoShort"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Get the repository.
     *
     * @param host The host name.
     * @param args The arguments.
     * @param update Force update.
     * @param timeoutMs timeout in ms.
     */
    getRepository(host, args, update, timeoutMs) {
        return this.request({
            cacheKey: `repository_${host}`,
            forceUpdate: update,
            commandTimeout: timeoutMs,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getRepository', args, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getRepository"');
                    }
                    else if (!data) {
                        reject('Cannot read "getRepository"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Get the installed.
     *
     * @param host The host name.
     * @param update Force update.
     * @param cmdTimeout timeout in ms
     */
    getInstalled(host, update, cmdTimeout) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `installed_${host}`,
            forceUpdate: update,
            commandTimeout: cmdTimeout,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getInstalled', null, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getInstalled"');
                    }
                    else if (!data) {
                        reject('Cannot read "getInstalled"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Execute a command on a host.
     */
    cmdExec(
    /** The host name. */
    host, 
    /** The command to execute. */
    cmd, 
    /** The command ID. */
    cmdId, 
    /** Timeout of command in ms */
    cmdTimeout) {
        return this.request({
            commandTimeout: cmdTimeout,
            executor: (resolve, reject, timeout) => {
                host = normalizeHostId(host);
                this._socket.emit('cmdExec', host, cmdId, cmd, err => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Read the base settings of a given host.
     *
     * @param host The host name.
     */
    readBaseSettings(host) {
        // Make sure we deal with a hostname, not an object ID
        host = objectIdToHostname(host);
        return this.request({
            requireFeatures: ['CONTROLLER_READWRITE_BASE_SETTINGS'],
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'readBaseSettings', null, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "BaseSettings"');
                    }
                    else if (!data) {
                        reject('Cannot read "BaseSettings"');
                    }
                    else if (data.error) {
                        reject(new Error(data.error));
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Write the base settings of a given host.
     *
     * @param host The host name.
     * @param config The configuration to write.
     */
    writeBaseSettings(host, config) {
        // Make sure we deal with a hostname, not an object ID
        host = objectIdToHostname(host);
        return this.request({
            requireFeatures: ['CONTROLLER_READWRITE_BASE_SETTINGS'],
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'writeBaseSettings', config, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not write "BaseSettings"');
                    }
                    else if (!data) {
                        reject('Cannot write "BaseSettings"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    /**
     * Send command to restart the iobroker on host
     *
     * @param host The host name.
     */
    restartController(host) {
        // Make sure we deal with a hostname, not an object ID
        host = objectIdToHostname(host);
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'restartController', null, () => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    resolve(true);
                });
            },
        });
    }
    /**
     * Read statistics information from host
     *
     * @param host The host name.
     * @param typeOfDiag one of none, normal, no-city, extended
     */
    getDiagData(host, typeOfDiag) {
        // Make sure we deal with a hostname, not an object ID
        host = objectIdToHostname(host);
        return this.request({
            executor: (resolve, _reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getDiagData', typeOfDiag, result => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (!result) {
                        resolve(null);
                    }
                    else {
                        resolve(result);
                    }
                });
            },
        });
    }
    /**
     * Change the password of the given user.
     *
     * @param user The user name.
     * @param password The new password.
     */
    changePassword(user, password) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('changePassword', user, password, err => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            },
        });
    }
    /**
     * Get the IP addresses of the given host.
     *
     * @param host The host name.
     * @param update Force update.
     */
    getIpAddresses(host, update) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `IPs_${host}`,
            forceUpdate: update,
            // TODO: check if this should time out
            commandTimeout: false,
            executor: async (resolve) => {
                const obj = await this.getObject(host);
                resolve(obj?.common.address ?? []);
            },
        });
    }
    /**
     * Get the IP addresses with interface names of the given host or find host by IP.
     *
     * @param ipOrHostName The IP address or host name.
     * @param update Force update.
     */
    getHostByIp(ipOrHostName, update) {
        // Make sure we deal with a hostname, not an object ID
        ipOrHostName = objectIdToHostname(ipOrHostName);
        return this.request({
            cacheKey: `rIPs_${ipOrHostName}`,
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getHostByIp', ipOrHostName, (ip, host) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    const { IPs4, IPs6 } = parseIPAddresses(host);
                    resolve([...IPs4, ...IPs6]);
                });
            },
        });
    }
    /**
     * Encrypt a text
     *
     * @param plaintext The text to encrypt.
     */
    encrypt(plaintext) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('encrypt', plaintext, (err, ciphertext) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(ciphertext);
                });
            },
        });
    }
    /**
     * Decrypt a text
     *
     * @param ciphertext The text to decrypt.
     */
    decrypt(ciphertext) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('decrypt', ciphertext, (err, plaintext) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(plaintext);
                });
            },
        });
    }
    /**
     * Change access rights for file
     *
     * @param adapter adapter name
     * @param path file name with a full path. It could be like 'vis.0/*'
     * @param options like {mode: 0x644}
     * @param options.mode The new mode for the file
     */
    chmodFile(adapter, path, options) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('chmodFile', adapter, path, options, (err, processed) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(processed);
                });
            },
        });
    }
    /**
     * Change an owner or/and owner group for file
     *
     * @param adapter adapter name
     * @param filename file name with a full path. it could be like vis.0/*
     * @param options like {owner: "newOwner", ownerGroup: "newGroup"}
     * @param options.owner The new owner for the file
     * @param options.ownerGroup The new owner group for the file
     */
    chownFile(adapter, filename, options) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('chownFile', adapter, filename, options, (err, processed) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(processed);
                });
            },
        });
    }
    /**
     * Get the alarm notifications from a host (only for admin connection).
     *
     * @param host The host name.
     * @param category - optional
     */
    getNotifications(host, category) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'getNotifications', { category }, notifications => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    resolve(notifications);
                });
            },
        });
    }
    /**
     * Clear the alarm notifications on a host (only for admin connection).
     *
     * @param host The host name.
     * @param category - optional
     */
    clearNotifications(host, category) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('sendToHost', host, 'clearNotifications', { category }, notifications => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    resolve(notifications);
                });
            },
        });
    }
    /**
     * Read if only easy mode is allowed (only for admin connection).
     */
    getIsEasyModeStrict() {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getIsEasyModeStrict', (err, isStrict) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(!!isStrict);
                });
            },
        });
    }
    /**
     * Read easy mode configuration (only for admin connection).
     */
    getEasyMode() {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getEasyMode', (err, config) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(new Error(err));
                    }
                    else {
                        resolve(config);
                    }
                });
            },
        });
    }
    /**
     * Read adapter ratings
     */
    getRatings(update) {
        return this.request({
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getRatings', !!update, (err, ratings) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(new Error(err));
                    }
                    else {
                        resolve(ratings);
                    }
                });
            },
        });
    }
    getCurrentSession(cmdTimeout) {
        const controller = new AbortController();
        return this.request({
            commandTimeout: cmdTimeout || 5000,
            onTimeout: () => {
                controller.abort();
            },
            executor: async (resolve, reject, timeout) => {
                try {
                    const res = await fetch('./session', {
                        signal: controller.signal,
                    });
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    resolve(res.json());
                }
                catch (e) {
                    reject(`getCurrentSession: ${e}`);
                }
            },
        });
    }
    /**
     * Read current web, socketio or admin namespace, like admin.0
     */
    getCurrentInstance() {
        return this.request({
            cacheKey: 'currentInstance',
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCurrentInstance', (err, namespace) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(namespace);
                });
            },
        });
    }
    /**
     * Get all instances of the given adapter or get all instances.
     *
     * @param adapter The name of the adapter.
     * @param update Force update.
     */
    getAdapterInstances(adapter, update) {
        let adapterStr;
        if (typeof adapter === 'boolean') {
            update = adapter;
            adapterStr = '';
        }
        else {
            adapterStr = adapter || '';
        }
        return this.request({
            cacheKey: `instances_${adapterStr}`,
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getAdapterInstances', adapterStr, (err, instances) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(instances);
                });
            },
        });
    }
    /**
     * Get adapters with the given name or get all adapters.
     *
     * @param adapter The name of the adapter.
     * @param update Force update.
     */
    getAdapters(adapter, update) {
        let adapterStr;
        if (typeof adapter === 'boolean') {
            update = adapter;
            adapterStr = '';
        }
        else {
            adapterStr = adapter || '';
        }
        return this.request({
            cacheKey: `adapter_${adapterStr}`,
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getAdapters', adapterStr, (err, adapters) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(adapters);
                });
            },
        });
    }
    // returns very optimized information for adapters to minimize a connection load
    getCompactAdapters(update) {
        return this.request({
            cacheKey: 'compactAdapters',
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactAdapters', (err, adapters) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(adapters);
                });
            },
        });
    }
    // reset cached promise, so next time the information will be requested anew
    getAdaptersResetCache(adapter) {
        adapter = adapter ?? '';
        this.resetCache(`adapter_${adapter}`);
        this.resetCache(`compactAdapters`);
    }
    // returns very optimized information for adapters to minimize a connection load
    getCompactInstances(update) {
        return this.request({
            cacheKey: 'compactInstances',
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactInstances', (err, instances) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(instances);
                });
            },
        });
    }
    // reset cached promise, so next time the information will be requested anew
    getAdapterInstancesResetCache(adapter) {
        adapter = adapter ?? '';
        this.resetCache(`instances_${adapter}`);
        this.resetCache(`compactInstances`);
    }
    // returns very optimized information for adapters to minimize a connection load
    // reads only a version of installed adapter
    getCompactInstalled(host, update, cmdTimeout) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `installedCompact_${host}`,
            forceUpdate: update,
            commandTimeout: cmdTimeout,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactInstalled', host, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getCompactInstalled"');
                    }
                    else if (!data) {
                        reject('Cannot read "getCompactInstalled"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    // reset cached promise, so next time the information will be requested anew
    getInstalledResetCache(host) {
        if (!host) {
            this.resetCache(`installedCompact_`, true);
            this.resetCache(`installed_`, true);
        }
        else {
            this.resetCache(`installedCompact_${host}`);
            this.resetCache(`installed_${host}`);
        }
    }
    /**
     * Get the repository in compact form (only version and icon).
     *
     * @param host The host name.
     * @param update Force update.
     * @param timeoutMs timeout in ms.
     */
    getCompactRepository(host, update, timeoutMs) {
        host = normalizeHostId(host);
        return this.request({
            cacheKey: `repositoryCompact_${host}`,
            forceUpdate: update,
            commandTimeout: timeoutMs,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactRepository', host, data => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (data === ERRORS.PERMISSION_ERROR) {
                        reject('May not read "getCompactRepository"');
                    }
                    else if (!data) {
                        reject('Cannot read "getCompactRepository"');
                    }
                    else {
                        resolve(data);
                    }
                });
            },
        });
    }
    // reset cached promise, so next time the information will be requested anew
    getRepositoryResetCache(host) {
        if (!host) {
            this.resetCache(`repositoryCompact_`, true);
            this.resetCache(`repository_`, true);
        }
        else {
            this.resetCache(`repositoryCompact_${host}`);
            this.resetCache(`repository_${host}`);
        }
    }
    /**
     * Get the list of all hosts in compact form (only _id, common.name, common.icon, common.color, native.hardware.networkInterfaces)
     *
     * @param update Force update.
     */
    getCompactHosts(update) {
        return this.request({
            cacheKey: 'hostsCompact',
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactHosts', (err, compactHostsInfo) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(compactHostsInfo);
                });
            },
        });
    }
    /**
     * Get `system.repository` without big JSON
     */
    getCompactSystemRepositories(update) {
        return this.request({
            cacheKey: 'repositoriesCompact',
            forceUpdate: update,
            executor: (resolve, reject, timeout) => {
                this._socket.emit('getCompactSystemRepositories', (err, systemRepositories) => {
                    if (timeout.elapsed) {
                        return;
                    }
                    timeout.clearTimeout();
                    if (err) {
                        reject(err);
                    }
                    resolve(systemRepositories);
                });
            },
        });
    }
}
//# sourceMappingURL=AdminConnection.js.map