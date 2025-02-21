import { Connection, type RequestOptions } from './Connection.js';
import type { ConnectionProps } from './ConnectionProps.js';
import type { AdminEmitEvents, AdminListenEvents, CompactAdapterInfo, CompactHost, CompactInstalledInfo, CompactInstanceInfo, CompactRepository, CompactSystemRepository, License, LogFile } from './SocketEvents.js';
interface Certificate {
    name: string;
    type: 'public' | 'private' | 'chained';
}
export type MultilingualObject = Exclude<ioBroker.StringOrTranslated, string>;
export type Severity = 'info' | 'notify' | 'alert';
export interface NotificationMessageObject {
    message: string;
    ts: number;
}
export interface FilteredNotificationInformation {
    [scope: string]: {
        description: MultilingualObject;
        name: MultilingualObject;
        categories: {
            [category: string]: {
                description: MultilingualObject;
                name: MultilingualObject;
                severity: Severity;
                instances: {
                    [instance: string]: {
                        messages: NotificationMessageObject[];
                    };
                };
            };
        };
    };
}
export interface IPAddress {
    name: string;
    address: string;
    family: 'ipv4' | 'ipv6';
    internal?: boolean;
}
export declare class AdminConnection extends Connection<AdminListenEvents, AdminEmitEvents> {
    constructor(props: ConnectionProps);
    protected request<T>(options: RequestOptions<T>): Promise<T>;
    /**
     * Get the stored certificates.
     *
     * @param update Force update.
     */
    getCertificates(update?: boolean): Promise<Certificate[]>;
    /**
     * Get the logs from a host (only for admin connection).
     */
    getLogs(host: string, linesNumber?: number): Promise<(string | number)[] | string | {
        error: string;
    }>;
    /**
     * Upgrade adapter with webserver.
     */
    upgradeAdapterWithWebserver(host: string, options: {
        version: string;
        adapterName: string;
        port: number;
        useHttps?: boolean;
        certPublicName?: string;
        certPrivateName?: string;
    }): Promise<{
        result: boolean;
    }>;
    /**
     * Upgrade controller
     */
    upgradeController(host: string, version: string, adminInstance: number): Promise<string>;
    /**
     * Read licenses from ioBroker.net anew
     */
    updateLicenses(
    /** login for ioBroker.net */
    login: string, 
    /** password for ioBroker.net */
    password: string): Promise<License[] | undefined>;
    /**
     * Upgrade controller
     */
    upgradeOsPackages(host: string, packages: {
        name: string;
        version?: string;
    }[], restart?: boolean): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get the log files (only for admin connection).
     */
    getLogsFiles(host: string): Promise<LogFile[]>;
    /**
     * Delete the logs from a host (only for admin connection).
     */
    delLogs(host: string): Promise<void>;
    /**
     * Delete a file of an adapter.
     *
     * @param adapter The adapter name.
     * @param fileName The file name.
     */
    deleteFile(adapter: string, fileName: string): Promise<void>;
    /**
     * Delete a folder of an adapter.
     *
     * @param adapter The adapter name.
     * @param folderName The folder name.
     */
    deleteFolder(adapter: string, folderName: string): Promise<void>;
    /**
     * Rename file or folder in ioBroker DB
     *
     * @param adapter instance name
     * @param oldName current file name, e.g., main/vis-views.json
     * @param newName new file name, e.g., main/vis-views-new.json
     */
    rename(adapter: string, oldName: string, newName: string): Promise<void>;
    /**
     * Rename file in ioBroker DB
     *
     * @param adapter instance name
     * @param oldName current file name, e.g., main/vis-views.json
     * @param newName new file name, e.g., main/vis-views-new.json
     */
    renameFile(adapter: string, oldName: string, newName: string): Promise<void>;
    /**
     * Get the list of all hosts.
     *
     * @param update Force update.
     */
    getHosts(update?: boolean): Promise<ioBroker.HostObject[]>;
    /**
     * Get the list of all users.
     *
     * @param update Force update.
     */
    getUsers(update?: boolean): Promise<ioBroker.UserObject[]>;
    /**
     * Rename a group.
     *
     * @param id The id.
     * @param newId The new id.
     * @param newName The new name.
     */
    renameGroup(id: string, newId: string, newName: ioBroker.StringOrTranslated): Promise<void>;
    /**
     * Get the host information.
     *
     * @param host host name
     * @param update Force update.
     * @param timeoutMs optional read timeout.
     */
    getHostInfo(host: string, update?: boolean, timeoutMs?: number): Promise<any>;
    /**
     * Get the host information (short version).
     *
     * @param host host name
     * @param update Force update.
     * @param timeoutMs optional read timeout.
     */
    getHostInfoShort(host: string, update?: boolean, timeoutMs?: number): Promise<any>;
    /**
     * Get the repository.
     *
     * @param host The host name.
     * @param args The arguments.
     * @param update Force update.
     * @param timeoutMs timeout in ms.
     */
    getRepository(host: string, args?: {
        update?: boolean;
        repo?: string | string[];
    } | string | null, update?: boolean, timeoutMs?: number): Promise<any>;
    /**
     * Get the installed.
     *
     * @param host The host name.
     * @param update Force update.
     * @param cmdTimeout timeout in ms
     */
    getInstalled(host: string, update?: boolean, cmdTimeout?: number): Promise<any>;
    /**
     * Execute a command on a host.
     */
    cmdExec(
    /** The host name. */
    host: string, 
    /** The command to execute. */
    cmd: string, 
    /** The command ID. */
    cmdId: number, 
    /** Timeout of command in ms */
    cmdTimeout?: number): Promise<void>;
    /**
     * Read the base settings of a given host.
     *
     * @param host The host name.
     */
    readBaseSettings(host: string): Promise<{
        config?: ioBroker.IoBrokerJson;
        isActive?: boolean;
    }>;
    /**
     * Write the base settings of a given host.
     *
     * @param host The host name.
     * @param config The configuration to write.
     */
    writeBaseSettings(host: string, config: ioBroker.IoBrokerJson): Promise<{
        error?: any;
        result?: 'ok';
    }>;
    /**
     * Send command to restart the iobroker on host
     *
     * @param host The host name.
     */
    restartController(host: string): Promise<true>;
    /**
     * Read statistics information from host
     *
     * @param host The host name.
     * @param typeOfDiag one of none, normal, no-city, extended
     */
    getDiagData(host: string, typeOfDiag: string): Promise<Record<string, any> | null>;
    /**
     * Change the password of the given user.
     *
     * @param user The user name.
     * @param password The new password.
     */
    changePassword(user: string, password: string): Promise<void>;
    /**
     * Get the IP addresses of the given host.
     *
     * @param host The host name.
     * @param update Force update.
     */
    getIpAddresses(host: string, update?: boolean): Promise<string[]>;
    /**
     * Get the IP addresses with interface names of the given host or find host by IP.
     *
     * @param ipOrHostName The IP address or host name.
     * @param update Force update.
     */
    getHostByIp(ipOrHostName: string, update?: boolean): Promise<IPAddress[]>;
    /**
     * Encrypt a text
     *
     * @param plaintext The text to encrypt.
     */
    encrypt(plaintext: string): Promise<string>;
    /**
     * Decrypt a text
     *
     * @param ciphertext The text to decrypt.
     */
    decrypt(ciphertext: string): Promise<string>;
    /**
     * Change access rights for file
     *
     * @param adapter adapter name
     * @param path file name with a full path. It could be like 'vis.0/*'
     * @param options like {mode: 0x644}
     * @param options.mode The new mode for the file
     */
    chmodFile(adapter: string | null, path: string, options?: {
        mode: number | string;
    }): Promise<ioBroker.ChownFileResult[]>;
    /**
     * Change an owner or/and owner group for file
     *
     * @param adapter adapter name
     * @param filename file name with a full path. it could be like vis.0/*
     * @param options like {owner: "newOwner", ownerGroup: "newGroup"}
     * @param options.owner The new owner for the file
     * @param options.ownerGroup The new owner group for the file
     */
    chownFile(adapter: string, filename: string, options?: {
        owner?: string;
        ownerGroup?: string;
    }): Promise<ioBroker.ChownFileResult[]>;
    /**
     * Get the alarm notifications from a host (only for admin connection).
     *
     * @param host The host name.
     * @param category - optional
     */
    getNotifications(host: string, category?: string): Promise<void | {
        result: FilteredNotificationInformation;
    }>;
    /**
     * Clear the alarm notifications on a host (only for admin connection).
     *
     * @param host The host name.
     * @param category - optional
     */
    clearNotifications(host: string, category: string): Promise<any>;
    /**
     * Read if only easy mode is allowed (only for admin connection).
     */
    getIsEasyModeStrict(): Promise<boolean>;
    /**
     * Read easy mode configuration (only for admin connection).
     */
    getEasyMode(): Promise<{
        strict: boolean;
        configs: {
            id: string;
            title: ioBroker.StringOrTranslated;
            desc: ioBroker.StringOrTranslated;
            color: string;
            url: string;
            icon: string;
            materialize: boolean;
            jsonConfig: boolean;
            version: string;
        }[];
    }>;
    /**
     * Read adapter ratings
     */
    getRatings(update?: boolean): Promise<{
        [adapterName: string]: {
            rating: {
                r: number;
                c: number;
            };
            [versionNumber: string]: {
                r: number;
                c: number;
            };
        };
    }>;
    getCurrentSession(cmdTimeout?: number): any;
    /**
     * Read current web, socketio or admin namespace, like admin.0
     */
    getCurrentInstance(): Promise<string>;
    /**
     * Get all instances of the given adapter or get all instances.
     *
     * @param adapter The name of the adapter.
     * @param update Force update.
     */
    getAdapterInstances(adapter?: string | boolean, update?: boolean): Promise<ioBroker.InstanceObject[]>;
    /**
     * Get adapters with the given name or get all adapters.
     *
     * @param adapter The name of the adapter.
     * @param update Force update.
     */
    getAdapters(adapter?: string | boolean, update?: boolean): Promise<ioBroker.AdapterObject[]>;
    getCompactAdapters(update?: boolean): Promise<Record<string, CompactAdapterInfo>>;
    getAdaptersResetCache(adapter?: string): void;
    getCompactInstances(update?: boolean): Promise<Record<string, CompactInstanceInfo>>;
    getAdapterInstancesResetCache(adapter?: string): void;
    getCompactInstalled(host: string, update?: boolean, cmdTimeout?: number): Promise<CompactInstalledInfo>;
    getInstalledResetCache(host?: string): void;
    /**
     * Get the repository in compact form (only version and icon).
     *
     * @param host The host name.
     * @param update Force update.
     * @param timeoutMs timeout in ms.
     */
    getCompactRepository(host: string, update?: boolean, timeoutMs?: number): Promise<CompactRepository>;
    getRepositoryResetCache(host: string): void;
    /**
     * Get the list of all hosts in compact form (only _id, common.name, common.icon, common.color, native.hardware.networkInterfaces)
     *
     * @param update Force update.
     */
    getCompactHosts(update?: boolean): Promise<CompactHost[]>;
    /**
     * Get `system.repository` without big JSON
     */
    getCompactSystemRepositories(update?: boolean): Promise<CompactSystemRepository>;
}
export {};
