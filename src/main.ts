import * as redis from '@redis/client';
import Ioredis from 'ioredis';
import * as os from 'os';
import assert from 'assert';

interface ClientInterface {
    info(): Promise<string>;
    set(key: string, value: string): Promise<unknown>;
    get(key: string): Promise<string | null>;
}

async function makeNodeRedisClientAsync(port: number | null): Promise<ClientInterface> {
    const client: redis.RedisClientType = (port === null)
        ? redis.createClient()
        : redis.createClient({url: `redis://localhost:${port}`});
    await client.connect();
    return client;
}

async function makeIoredisClientAsync(port: number | null): Promise<ClientInterface> {
    const client = (port === null)
        ? new Ioredis({enableAutoPipelining: true})
        : new Ioredis(port, {enableAutoPipelining: true});
    return client;
}

const clientConstructors: ReadonlyArray<readonly [packageName: string, constructAsync: (port: number | null) => Promise<ClientInterface>]> = [
    ['@redis/client', makeNodeRedisClientAsync] as const,
    //['ioredis', makeIoredisClientAsync] as const,
];

async function mainAsync(progName: string, args: Array<string>): Promise<void> {
    let port: number | null;
    if (args.length === 0) {
        port = null;
    } else if (args.length === 1) {
        port = parseInt(args[0]);
        if (Number.isNaN(port)) {
            console.error(`Bad port number: ${JSON.stringify(args[0])}`);
            process.exit(1);
        }
    } else {
        console.error(`Usage: ${progName} [redis-port]`);
        process.exit(1);
    }

    printSystemInformation();
    console.log();

    const numTasksToTest = [2, 8];
    const numRuns = 3;

    let redisVersion = null;
    const maxClients = Math.max(...numTasksToTest);
    console.error(`Setting up ${maxClients} Redis clients.`);
    const libraryNameAndClients: Array<{libraryName: string, clients: Array<ClientInterface>}> = [];
    for (const [libraryName, clientConstructorAsync] of clientConstructors) {
        const clients: Array<ClientInterface> = [];
        for (let i = 0; i < maxClients; i++) {
            const client = await clientConstructorAsync(port);
            clients.push(client);

            const info = await client.info();
            redisVersion = checkVersionInInfo(info, redisVersion);
        }
        libraryNameAndClients.push({libraryName, clients});
    }

    assert(redisVersion !== null);
    console.log(`Connected to Redis ${redisVersion}.`);
    console.log();
    console.log(`Reporting the results for each configuration on a single line.`);
    console.log(`Running each configuration ${numRuns} times (after a warm-up run).`);
    console.log("Each run's results are reported as: average-ms ↕min-max-diff-ms");
    console.log();

    const totalBytesPerTest = 2_000_000_000;

    for (const [keySize, valueSize] of [[20, 10], [20, 1_000], [100, 10]]) {
        const key = randomString(keySize);
        const value = randomString(valueSize);

        // Hacks to derive a 'numIterations' value that will make the tests take the same amount of time
        // for different values of 'valueSize'. (This is clowny. We should do what other benchmark tools
        // do and determine this dynamically instead of ahead-of-time.)
        const overheadPseudoBytesPerOperation = 25_000;
        const pseudoBytesPerIteration = (keySize*2) + (valueSize*2) + (overheadPseudoBytesPerOperation*2);
        const numIterations = Math.floor(totalBytesPerTest / pseudoBytesPerIteration);

        console.log(`set+get, ${keySize.toLocaleString()}-char key, ${valueSize.toLocaleString()}-char value, (~${numIterations.toLocaleString()} iterations)`);

        for (const numTasks of numTasksToTest) {
            console.log(`  ${numTasks.toLocaleString()} concurrent tasks`);
            const numIterationsPerTask = Math.floor(numIterations / numTasks);

            for (const {libraryName, clients} of libraryNameAndClients) {
                assert(clients.length >= numTasks);
                const connectionPerTaskResult = await benchAsync(numRuns, numIterationsPerTask, key, value, clients.slice(0, numTasks));
                console.log(`    ${connectionPerTaskResult} | ${libraryName}, connection per task`);

                const sharedConnectionResult = await benchAsync(numRuns, numIterationsPerTask, key, value, new Array(numTasks).fill(clients[0]));
                console.log(`    ${sharedConnectionResult} | ${libraryName}, shared connection`);
            }
        }
        console.log();
    }
}

function checkVersionInInfo(info: string, lastSeenRedisVersion: string | null): string {
    // Make sure all clients connect to the same Redis version.
    // Why? I once accidentally ran Redis server versions at the same time and clients would
    // arbitrarily connect to one or the other, ruining the point of the benchmark!
    const prefix = 'redis_version:';
    const versionLines = info.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith(prefix))
        .map(l => l.substring(prefix.length));
    assert(versionLines.length === 1)
    const redisVersion = versionLines[0];
    if (lastSeenRedisVersion === null) {
        lastSeenRedisVersion = redisVersion;
    } else {
        if (redisVersion !== lastSeenRedisVersion) {
            console.error(`Connection got different Redis version: ${redisVersion} vs ${lastSeenRedisVersion}.`);
            process.exit(1);
        }
    }
    return lastSeenRedisVersion;
}

async function benchAsync(
    numRuns: number,
    numIterationsPerTask: number,
    key: string,
    value: string,
    clients: Array<ClientInterface>,
): Promise<string> {
    const elapsedMsRanges = [];
    for (let i = 0; i < numRuns + 1; i++) {

        // Run tasks in parallel, one per client.
        const promises = [];
        for (const client of clients) {
            promises.push((async () => {
                const startTime = Date.now();
                for (let i = 0; i < numIterationsPerTask; i++) {
                    await client.set(key, value);
                    await client.get(key);
                }
                return Date.now() - startTime;
            })());
        }
        const elapsedMses = await Promise.all(promises);

        // Report the max time and the difference between the min and max.
        const meanMs = Math.floor(elapsedMses.reduce((a, b) => a + b) / elapsedMses.length);
        const rangeMs = Math.max(...elapsedMses) - Math.min(...elapsedMses);
        elapsedMsRanges.push(`${String(meanMs).padStart(5, ' ')} ↕${String(rangeMs).padEnd(4, ' ')}`);
    }
    // Consider the first run a warm-up.  Don't include it in the results.
    return elapsedMsRanges.slice(1).join(' ');
}

function printSystemInformation(): void {
    const cpuCountsByModel = new Map();
    for (const cpu of os.cpus()) {
        if (cpuCountsByModel.has(cpu.model)) {
            cpuCountsByModel.set(cpu.model, cpuCountsByModel.get(cpu.model) + 1);
        } else {
            cpuCountsByModel.set(cpu.model, 1);
        }
    }
    for (const [model, count] of cpuCountsByModel) {
        console.log(`CPU   ${count}x ${model}`);
    }
    console.log(`Node  ${process.versions.node}`);
    console.log(`V8    ${process.versions.v8}`);
    console.log(`OS    ${os.platform()}, ${os.release()}`);
    console.log();
    for (const [packageName, _constructAsync] of clientConstructors) {
        console.log(`NPM ${packageName} ${require(`${packageName}/package.json`).version}`); // eslint-disable-line @typescript-eslint/no-var-requires
    }
}

const digits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXYZ';

function randomString(length: number): string {
    const parts = [];
    for (let i = 0; i < length; i++) {
        parts.push(digits.charAt(Math.random() * digits.length));
    }
    return parts.join('');
}

if (require.main === module) {
    mainAsync(process.argv[1], process.argv.slice(2))
        .then(() => process.exit(0))  // TODO: This process.exit call shouldn't be necessary.  Figure out why the program won't exit without it.
        .catch(err => { console.error(err); })
}
