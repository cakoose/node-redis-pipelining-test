# Node Redis Pipelining Test

The NPM "redis" package ([node\_redis](https://github.com/NodeRedis/node_redis)) automatically pipelines requests.  This means that you _should_ be able to share a connection across your entire Node process (i.e. a single call to `redis.createClient`), even if you're performing multiple concurrent requests.

This benchmark tests if that's the case.
1. Spawn multiple "tasks" (basically just `async` functions).
2. Each task does a bunch of Redis "GET" operations.  (Our key and value are the same length, so we send and receive roughly the same amount data.)

The results I got suggest that yes, it's better to use a single shared connection.

# To run

1. Download dependencies: `yarn install --frozen-lockfile`
2. Make sure Redis is running.
3. Run benchmark: `yarn run bench`

# Results

MacBook Pro 15" 2017

```
CPU        8x Intel(R) Core(TM) i7-7920HQ CPU @ 3.10GHz
Node       8.15.0
V8         6.2.414.75
OS         darwin, 18.7.0
NPM redis  2.8.0

Setting up 8 Redis clients.
Connected to Redis 5.0.5.

Running each configuration 3 times (after a warm-up run).
Reporting the results for each configuration on a single line.
Result format: task-elapsed-ms-average (slowest-fastest-task-difference-ms)

10-char K/V, (33277 iterations)
  2 tasks
    1909 (0) 1823 (0) 1802 (0), shared connection
    1786 (1) 1957 (2) 1878 (1), connection per task
  4 tasks
    2428 (0) 2494 (0) 2493 (0), shared connection
    3223 (95) 3300 (46) 3114 (70), connection per task
  8 tasks
    4019 (0) 4054 (0) 4004 (0), shared connection
    6105 (299) 5979 (456) 6085 (255), connection per task

1000-char K/V, (28571 iterations)
  2 tasks
    1646 (0) 1655 (0) 1641 (0), shared connection
    1651 (1) 1621 (0) 1630 (2), connection per task
  4 tasks
    2235 (0) 2299 (0) 2279 (0), shared connection
    3087 (159) 3116 (100) 2868 (106), connection per task
  8 tasks
    3847 (0) 3906 (1) 3820 (0), shared connection
    5616 (313) 5674 (200) 5782 (230), connection per task

100000-char K/V, (1886 iterations)
  2 tasks
    3627 (0) 3790 (0) 3823 (0), shared connection
    3889 (1) 3840 (0) 3717 (31), connection per task
  4 tasks
    5211 (1) 5258 (0) 5222 (1), shared connection
    6610 (855) 6411 (1311) 5345 (1298), connection per task
  8 tasks
    8764 (1) 9375 (1) 6241 (0), shared connection
    11601 (1669) 12086 (1530) 11659 (1538), connection per task
```
