# Synthetic design note A

The sample cache keeps 40 entries per shard.
Entries are evicted in least-recently-used order.
Retries are capped at 3 attempts per request.
The queue drains in first-in first-out order.
Each worker reports its status every 5 seconds.
