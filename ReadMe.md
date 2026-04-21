# Node Redis Pipelining Test

Redis clients typically automatically pipeline your queries:
- [redis](https://github.com/NodeRedis/node_redis) (aka "@redis/client)
- [ioredis](https://github.com/redis/ioredis)
- [valkey-glide](https://github.com/valkey-io/valkey-glide)

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

MacBook Pro 16" 2023

```
$ yarn run main
CPU   12x Apple M3 Pro
Node  24.14.1
V8    13.6.233.17-node.44
OS    darwin, 24.6.0

NPM @redis/client unknown
NPM ioredis 5.10.1
NPM @valkey/valkey-glide 2.3.1

Setting up 8 Redis clients.
Connected to Redis 8.4.0.

Reporting the results for each configuration on a single line.
Running each configuration 3 times (after a warm-up run).
Each run's results are reported as: average-ms ↕min-max-diff-ms

set+get, 20-char key, 10-char value (39,952 iterations)
  2 concurrent tasks
     1182 ±0     1060 ±0     1193 ±1    | @redis/client, connection per task
      937 ±0      936 ±0      934 ±0    | @redis/client, shared connection
     1251 ±0     1242 ±1     1243 ±1    | ioredis, connection per task
     1138 ±0     1144 ±0     1140 ±0    | ioredis, shared connection
     2209 ±2     2206 ±1     2215 ±2    | @valkey/valkey-glide, connection per task
     2331 ±0     2133 ±0     2118 ±0    | @valkey/valkey-glide, shared connection
  8 concurrent tasks
      577 ±2      579 ±0      572 ±1    | @redis/client, connection per task
      343 ±0      343 ±0      340 ±0    | @redis/client, shared connection
      784 ±2      785 ±1      787 ±2    | ioredis, connection per task
      402 ±0      404 ±0      404 ±0    | ioredis, shared connection
      883 ±5      876 ±4      879 ±4    | @valkey/valkey-glide, connection per task
      675 ±0      670 ±1      668 ±0    | @valkey/valkey-glide, shared connection

set+get, 20-char key, 1,000-char value (38,431 iterations)
  2 concurrent tasks
     1227 ±0     1227 ±1     1233 ±0    | @redis/client, connection per task
      993 ±0      996 ±0      996 ±0    | @redis/client, shared connection
     1279 ±1     1284 ±0     1266 ±1    | ioredis, connection per task
     1134 ±0     1135 ±0     1138 ±0    | ioredis, shared connection
     2456 ±2     2213 ±1     2217 ±1    | @valkey/valkey-glide, connection per task
     2204 ±0     2195 ±0     2163 ±0    | @valkey/valkey-glide, shared connection
  8 concurrent tasks
      596 ±1      606 ±1      604 ±0    | @redis/client, connection per task
      368 ±0      368 ±0      362 ±0    | @redis/client, shared connection
      796 ±1      794 ±0      793 ±1    | ioredis, connection per task
      424 ±0      421 ±0      420 ±0    | ioredis, shared connection
      865 ±4      864 ±4      868 ±5    | @valkey/valkey-glide, connection per task
      689 ±0      687 ±0      691 ±0    | @valkey/valkey-glide, shared connection

set+get, 100-char key, 10-char value (39,824 iterations)
  2 concurrent tasks
     1225 ±1     1236 ±0     1233 ±0    | @redis/client, connection per task
     1009 ±0     1006 ±0      997 ±0    | @redis/client, shared connection
     1289 ±0     1349 ±0     1300 ±1    | ioredis, connection per task
     1183 ±0     1183 ±0     1180 ±0    | ioredis, shared connection
     2231 ±1     2223 ±1     2232 ±1    | @valkey/valkey-glide, connection per task
     2240 ±0     2228 ±0     2225 ±0    | @valkey/valkey-glide, shared connection
  8 concurrent tasks
      575 ±1      579 ±1      580 ±1    | @redis/client, connection per task
      361 ±0      361 ±0      360 ±0    | @redis/client, shared connection
      787 ±1      793 ±0      793 ±1    | ioredis, connection per task
      417 ±0      417 ±0      417 ±0    | ioredis, shared connection
      880 ±4      882 ±2      886 ±5    | @valkey/valkey-glide, connection per task
      681 ±0      677 ±0      676 ±0    | @valkey/valkey-glide, shared connection
```
