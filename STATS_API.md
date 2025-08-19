# Stats API Documentation

## Overview
The Stats API provides dynamic statistics for the charity project webpage, including information about families helped, villages covered, and case verification status.

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### 1. Get Main Statistics
**GET** `/api/stats`

Returns the main statistics for the charity project.

#### Response
```json
{
  "success": true,
  "data": {
    "familiesHelped": 25,
    "villagesCovered": 8,
    "casesVerified": 75,
    "totalCases": 40,
    "verifiedCases": 30,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Fields Description
- `familiesHelped`: Number of families that have been helped (approved cases)
- `villagesCovered`: Number of unique villages covered by approved cases
- `casesVerified`: Percentage of cases that have been verified (approved or rejected)
- `totalCases`: Total number of cases in the system
- `verifiedCases`: Number of cases that have been verified
- `timestamp`: When the statistics were generated

### 2. Get Impact Statistics
**GET** `/api/stats/impact`

Returns detailed impact statistics for the charity project.

#### Response
```json
{
  "success": true,
  "data": {
    "homesDestroyed": 15,
    "peopleAffected": 120,
    "casesVerifiedCount": 30,
    "fundsRaised": 50000,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Fields Description
- `homesDestroyed`: Number of homes with destruction percentage >= 50%
- `peopleAffected`: Total number of people affected across all cases
- `casesVerifiedCount`: Number of cases that have been verified
- `fundsRaised`: Total amount of funds raised for approved cases
- `timestamp`: When the statistics were generated

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## CORS
CORS is enabled for all endpoints, allowing frontend applications to fetch data from different domains.

## Usage Examples

### Frontend Integration
```javascript
import ApiService from '../services/api';

// Fetch main statistics
const stats = await ApiService.getStats();
console.log('Families helped:', stats.data.familiesHelped);

// Fetch impact statistics
const impactStats = await ApiService.getImpactStats();
console.log('People affected:', impactStats.data.peopleAffected);
```

### Direct API Call
```javascript
// Fetch main statistics
const response = await fetch('http://localhost:5000/api/stats');
const stats = await response.json();

// Fetch impact statistics
const impactResponse = await fetch('http://localhost:5000/api/stats/impact');
const impactStats = await impactResponse.json();
```

## Testing
Run the test script to verify the API is working:
```bash
cd backend
node test-stats.js
```

## Notes
- Statistics are calculated in real-time from the database
- All endpoints are publicly accessible (no authentication required)
- Data is cached for 30 seconds on the frontend for performance
- The API automatically handles database connection errors gracefully
