# Login regression report

The login page began returning HTTP 500 after yesterday's deployment. The
request reaches the authentication callback, then fails before a session cookie
is written. There is no confirmed root cause yet. The user asked for help
getting login working again, not for a new authentication design.
