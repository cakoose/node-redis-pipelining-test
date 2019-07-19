import * as redis from 'redis';
import * as os from 'os';
import * as assert from 'assert';

async function mainAsync(progName: string, args: Array<string>): Promise<void> {
    let options;
    if (args.length === 0) {
        options = {};
    } else if (args.length === 1) {
        const port = parseInt(args[0]);
        if (Number.isNaN(port)) {
            console.error(`Bad port number: ${JSON.stringify(args[0])}`);
            process.exit(1);
        }
        options = {port}
    } else {
        console.error(`Usage: ${progName} [redis-port]`);
        process.exit(1);
    }

    printSystemInformation();
    console.log();

    const numTasksToTest = [2, 4, 8];
    const numRuns = 3;

    const clients = [];
    let redisVersion = null;
    const maxClients = Math.max(...numTasksToTest);
    console.error(`Setting up ${maxClients} Redis clients.`);
    for (let i = 0; i < maxClients; i++) {
        const client = redis.createClient(options);
        client.on('error', err => {
            console.error(err);
            process.exit(1);
        });
        await new Promise(resolve => {
            client.on('ready', resolve);
        });

        if (redisVersion === null) {
            redisVersion = client.server_info.redis_version;
        } else {
            if (redisVersion !== client.server_info.redis_version) {
                console.error(`Connection ${i+1} got different Redis version: ${redisVersion} vs ${client.server_info.redis_version}`);
                process.exit(1);
            }
        }

        clients.push(client);
    }

    console.log(`Connected to Redis ${redisVersion}.`);
    console.log();
    console.log(`Running each configuration ${numRuns} times (after a warm-up run).`);
    console.log(`Reporting the results for each configuration on a single line.`);
    console.log("Result format: task-elapsed-ms-average (slowest-fastest-task-difference-ms)");
    console.log();

    for (const kvSize of [10, 1000, 100 * 1000]) {
        const key = randomString(kvSize);
        const value = randomString(kvSize);

        for (const client of clients) {
            await setAsync(client, key, value);
        }
        const numIterations = Math.floor((200 * 1000 * 1000) / (kvSize + 6000));

        console.log(`${kvSize}-char K/V, (${numIterations} iterations)`);
        for (const numTasks of numTasksToTest) {
            console.log(`  ${numTasks} tasks`);

            const sharedConnectionResult = await benchAsync(numRuns, numIterations, key, value, new Array(numTasks).fill(clients[0]));
            console.log(`    ${sharedConnectionResult}, shared connection`);

            assert(clients.length >= numTasks);
            const connectionPerTaskResult = await benchAsync(numRuns, numIterations, key, value, clients.slice(0, numTasks));
            console.log(`    ${connectionPerTaskResult}, connection per task`);
        }
        console.log();
    }
}

async function benchAsync(
    numRuns: number,
    numIterations: number,
    key: string,
    value: string,
    clientForTask: Array<redis.RedisClient>,
): Promise<string> {
    const elapsedMsRanges = [];
    for (let i = 0; i < numRuns + 1; i++) {

        // Run tasks in parallel, one per 'clientForTask'.
        const promises = [];
        for (const client of clientForTask) {
            promises.push((async () => {
                const startTime = Date.now();
                for (let i = 0; i < numIterations; i++) {
                    await getAsync(client, key)
                }
                return Date.now() - startTime;
            })());
        }
        const elapsedMses = await Promise.all(promises);

        // Report the max time and the difference between the min and max.
        const meanMs = Math.floor(elapsedMses.reduce((a, b) => a + b) / elapsedMses.length);
        const maxMs = Math.max(...elapsedMses);
        const minMs = Math.min(...elapsedMses);
        elapsedMsRanges.push(`${meanMs} (${maxMs - minMs})`);
    }
    // Consider the first run a warm-up.  Don't include it in the results.
    return elapsedMsRanges.slice(1).join(' ');
}

async function setAsync(client: redis.RedisClient, key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        client.set(key, value, err => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

async function getAsync(client: redis.RedisClient, key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        client.get(key, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
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
        console.log(`CPU        ${count}x ${model}`);
    }
    console.log(`Node       ${process.versions.node}`);
    console.log(`V8         ${process.versions.v8}`);
    console.log(`OS         ${os.platform()}, ${os.release()}`);
    console.log(`NPM redis  ${require(`redis/package.json`).version}`);
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
