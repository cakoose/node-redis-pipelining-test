# Node Redis Pipelining Test

Redis clients typically automatically pipeline your queries:
- [redis](https://github.com/NodeRedis/node_redis) (aka "@redis/client)
- [ioredis](https://github.com/redis/ioredis)

This means that it _should_ be more efficient to share a single connection across your entire Node process (i.e. a single call to `redis.createClient`), even if you're performing multiple concurrent requests.

This benchmark tests if that's the case.
1. Spawn multiple "tasks" (basically just `async` functions).
2. Each task does a bunch of Redis "GET" operations. (Our key and value are the same length, so we send and receive roughly the same amount data.)

The results I got suggest that yes, it's better to use a single shared connection.

# To run

1. Download dependencies: `yarn install`
2. Build: `yarn run build`
3. Make sure Redis is running.
4. Run benchmark: `yarn run main`

# Results

MacBook Pro 16" 2023 (M3)

```
CPU   12x Apple M3 Pro
Node  22.22.1
V8    12.4.254.21-node.35
OS    darwin, 24.6.0

NPM @redis/client 5.11.0
NPM ioredis 5.10.0

Setting up 8 Redis clients.
Connected to Redis 8.4.0.

Reporting the results for each configuration on a single line.
Running each configuration 3 times (after a warm-up run).
Each run's results are reported as: average-ms ↕min-max-diff-ms

set+get, 20-char key, 10-char value (39,952 iterations)
  2 concurrent tasks
     1225 ±0     1230 ±1     1240 ±0    | @redis/client, connection per task
      993 ±0      993 ±0     1008 ±0    | @redis/client, shared connection
     1337 ±1     1285 ±0     1274 ±1    | ioredis, connection per task
     1164 ±0     1169 ±0     1157 ±0    | ioredis, shared connection
  8 concurrent tasks
      595 ±1      569 ±0      583 ±1    | @redis/client, connection per task
      351 ±1      343 ±0      341 ±0    | @redis/client, shared connection
      827 ±1      823 ±2      823 ±2    | ioredis, connection per task
      405 ±0      412 ±0      343 ±0    | ioredis, shared connection

set+get, 20-char key, 1,000-char value (38,431 iterations)
  2 concurrent tasks
     1207 ±0     1228 ±1     1101 ±0    | @redis/client, connection per task
      993 ±0      999 ±0      995 ±0    | @redis/client, shared connection
     1193 ±0     1298 ±0     1311 ±0    | ioredis, connection per task
     1160 ±0     1152 ±0     1138 ±0    | ioredis, shared connection
  8 concurrent tasks
      589 ±0      586 ±2      599 ±2    | @redis/client, connection per task
      364 ±0      359 ±0      361 ±0    | @redis/client, shared connection
      820 ±1      848 ±1      899 ±1    | ioredis, connection per task
      457 ±0      431 ±0      436 ±0    | ioredis, shared connection

set+get, 100-char key, 10-char value (39,824 iterations)
  2 concurrent tasks
     1126 ±0     1086 ±1     1042 ±0    | @redis/client, connection per task
     1016 ±0     1016 ±0     1015 ±0    | @redis/client, shared connection
     1292 ±0     1183 ±1     1297 ±1    | ioredis, connection per task
     1094 ±0     1166 ±0     1104 ±0    | ioredis, shared connection
  8 concurrent tasks
      598 ±1      595 ±1      595 ±0    | @redis/client, connection per task
      348 ±0      355 ±0      353 ±0    | @redis/client, shared connection
      833 ±3      829 ±1      827 ±1    | ioredis, connection per task
      424 ±0      379 ±0      423 ±0    | ioredis, shared connection
```

MacBook Pro 16" 2019 (Intel)

```
CPU   12x Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
Node  18.12.1
V8    10.2.154.15-node.12
OS    darwin, 21.6.0

NPM @redis/client 1.4.2

Setting up 8 Redis clients.
Connected to Redis 6.2.8.

Reporting the results for each configuration on a single line.
Running each configuration 3 times (after a warm-up run).
Each run's results are reported as: average-ms ↕min-max-diff-ms

set+get, 20-char key, 10-char value, (~39,952 iterations)
  2 concurrent tasks
     2355 ↕0     2312 ↕0     2342 ↕0    | @redis/client, shared connection
     2058 ↕1     2052 ↕1     2223 ↕2    | @redis/client, connection per task
  8 concurrent tasks
      900 ↕0      836 ↕0      840 ↕1    | @redis/client, shared connection
     1776 ↕92    1741 ↕186   1730 ↕209  | @redis/client, connection per task

set+get, 20-char key, 1,000-char value, (~38,431 iterations)
  2 concurrent tasks
     2328 ↕0     2395 ↕0     2489 ↕0    | @redis/client, shared connection
     3348 ↕9     4238 ↕1     2596 ↕1    | @redis/client, connection per task
  8 concurrent tasks
     1014 ↕0     1008 ↕0     1013 ↕0    | @redis/client, shared connection
     1961 ↕184   1971 ↕226   1942 ↕141  | @redis/client, connection per task

set+get, 100-char key, 10-char value, (~39,824 iterations)
  2 concurrent tasks
     2527 ↕0     2463 ↕0     2430 ↕0    | @redis/client, shared connection
     2166 ↕1     2132 ↕1     2108 ↕0    | @redis/client, connection per task
  8 concurrent tasks
      800 ↕0      799 ↕0      797 ↕0    | @redis/client, shared connection
     1688 ↕144   1706 ↕94    1777 ↕70   | @redis/client, connection per task
```
