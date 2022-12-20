# Node Redis Pipelining Test

The NPM "redis" package ([node\_redis](https://github.com/NodeRedis/node_redis)) automatically pipelines requests.  This means that you _should_ be able to share a connection across your entire Node process (i.e. a single call to `redis.createClient`), even if you're performing multiple concurrent requests.

This benchmark tests if that's the case.
1. Spawn multiple "tasks" (basically just `async` functions).
2. Each task does a bunch of Redis "GET" operations.  (Our key and value are the same length, so we send and receive roughly the same amount data.)

The results I got suggest that yes, it's better to use a single shared connection.

# To run

1. Download dependencies: `yarn install`
2. Build: `yarn run build`
3. Make sure Redis is running.
4. Run benchmark: `yarn run main`

# Results

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
