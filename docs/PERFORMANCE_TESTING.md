# Performance Testing Guide

## Security Audit

Run npm audit to check for vulnerabilities:

```bash
# Backend
cd backend && npm audit

# Frontend
cd frontend && npm audit
```

**Current Status: ✅ 0 vulnerabilities**

---

## k6 Load Testing

### Installation

1. Download k6 from: https://k6.io/docs/get-started/installation/
2. Or use Docker: `docker pull grafana/k6`

### Running Load Tests

```bash
# Make sure backend is running first
cd backend && npm start

# Run performance tests
k6 run performance/api-load-test.js

# Run with custom base URL
k6 run -e BASE_URL=http://your-server:5000/api performance/api-load-test.js

# Run with more virtual users
k6 run --vus 50 --duration 2m performance/api-load-test.js
```

### Test Scenarios

The `api-load-test.js` tests:

1. **Auth endpoint** - Health check
2. **Lab Master GET** - Common read operation
3. **Pattern Master GET** - Pattern listing
4. **Planning Entry GET** - Planning data
5. **Search functionality** - Filtered queries

### Thresholds

- 95% of requests should complete in < 500ms
- Error rate should be < 10%

### Sample Output

```
running (3m00.0s), 00/20 VUs, 2847 complete and 0 interrupted iterations
default         [===================] 00/20 VUs  3m0s

     ✓ lab-master status is 200
     ✓ lab-master response time < 1s
     ✓ pattern-master status is 200

     http_req_duration..............: avg=45.23ms  p(95)=112.34ms
     http_reqs......................: 14235  79.1/s
     errors.........................: 0.00%  0/14235
```

---

## Recommended Performance Improvements

1. **Database Indexes** - Ensure frequently queried columns are indexed
2. **API Caching** - Add Cache-Control headers for static data
3. **Connection Pooling** - Use connection pooling for database
4. **Pagination** - Limit large result sets
