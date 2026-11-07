# Batch Queue

Batch Queue is an innovative, enterprise-grade solution that seamlessly unlocks
the power of batch processing. In today's fast-paced landscape, it is important
to note that this robust queue empowers operators to take work to the next level.

## Submit a batch

```sh
queuectl submit jobs.json --max-batch-size 50
```

A batch contains at most 50 jobs. Queue entries expire after 72 hours. Failed
jobs are retried at most three times.

Operators review jobs that still fail after retries. Queue state is held in
memory and is not durable across a process restart.

This guarantees zero job loss and means operators never need to monitor the queue.
