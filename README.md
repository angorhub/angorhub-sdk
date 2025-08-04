# AngorHub SDK

SDK for interacting with the AngorHub API. This SDK allows you to easily integrate AngorHub services into your web applications.

## Installation

You can install the SDK in various ways depending on your project.

### npm / yarn

```bash
npm install angorhub-sdk
# or
yarn add angorhub-sdk
```

### Direct browser usage

You can include the SDK directly in your HTML:

```html
<!-- First include axios -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<!-- Then include AngorHub SDK -->
<script src="https://unpkg.com/angorhub-sdk/dist/browser/angorhub-sdk.bundle.js"></script>
```

## Usage

### In a module environment (ES modules, TypeScript)

```typescript
import { AngorHubSDK } from 'angorhub-sdk';

const sdk = new AngorHubSDK('mainnet'); // Or 'testnet'

// Get projects
const projects = await sdk.getProjects(10, 0);
console.log(projects);

// Get project details
const projectDetails = await sdk.getProject('project-id');
console.log(projectDetails);
```

### In a CommonJS environment

```javascript
const { AngorHubSDK } = require('angorhub-sdk');

const sdk = new AngorHubSDK('mainnet'); // Or 'testnet'

// Get projects
sdk.getProjects(10, 0)
  .then(projects => {
    console.log(projects);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### In a browser

```html
<script>
  // The SDK is available as AngorHubSDK.AngorHubSDK
  const sdk = new AngorHubSDK.AngorHubSDK('mainnet');
  
  // Get projects
  sdk.getProjects(10, 0)
    .then(projects => {
      console.log(projects);
    })
    .catch(error => {
      console.error('Error:', error);
    });
</script>
```

### Using with React

```jsx
import React, { useEffect, useState } from 'react';
import { AngorHubSDK } from 'angorhub-sdk';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sdk = new AngorHubSDK('mainnet');
    
    async function fetchProjects() {
      try {
        const projectsData = await sdk.getProjects(10, 0);
        setProjects(projectsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjects();
  }, []);
  
  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>AngorHub Projects</h1>
      <ul>
        {projects.map(project => (
          <li key={project.projectIdentifier}>
            {project.projectIdentifier}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Using with Angular

```typescript
import { Component, OnInit } from '@angular/core';
import { AngorHubSDK } from 'angorhub-sdk';

@Component({
  selector: 'app-projects',
  template: `
    <div *ngIf="loading">Loading projects...</div>
    <div *ngIf="error">Error: {{ error }}</div>
    <div *ngIf="!loading && !error">
      <h1>AngorHub Projects</h1>
      <ul>
        <li *ngFor="let project of projects">
          {{ project.projectIdentifier }}
        </li>
      </ul>
    </div>
  `,
})
export class ProjectsComponent implements OnInit {
  projects = [];
  loading = true;
  error = null;
  
  ngOnInit() {
    const sdk = new AngorHubSDK('mainnet');
    
    sdk.getProjects(10, 0)
      .then(projectsData => {
        this.projects = projectsData;
        this.loading = false;
      })
      .catch(err => {
        this.error = err.message;
        this.loading = false;
      });
  }
}
```

## API Reference

### `new AngorHubSDK(network, config)`

Creates a new instance of the SDK.

- `network` - 'mainnet' or 'testnet'
- `config` (optional) - Configuration options:
  - `timeout` - Request timeout in milliseconds (default: 8000)
  - `useRemoteConfig` - Whether to use remote configuration (default: true)
  - `customIndexerUrl` - Custom indexer URL (optional)

### `sdk.getProjects(limit, offset)`

Get a list of projects.

- `limit` - Number of projects to return (default: 10)
- `offset` - Offset for pagination (default: 0)
- Returns: Promise resolving to an array of projects

### `sdk.getProject(projectId)`

Get details for a specific project.

- `projectId` - Project identifier
- Returns: Promise resolving to project details

### `sdk.getProjectStats(projectId)`

Get stats for a specific project.

- `projectId` - Project identifier
- Returns: Promise resolving to project stats

### `sdk.getProjectInvestments(projectId, limit, offset)`

Get investments for a specific project.

- `projectId` - Project identifier
- `limit` - Number of investments to return (default: 10)
- `offset` - Offset for pagination (default: 0)
- Returns: Promise resolving to an array of investments

### `sdk.getInvestorInvestment(projectId, investorPublicKey)`

Get an investor's investment for a specific project.

- `projectId` - Project identifier
- `investorPublicKey` - Investor public key
- Returns: Promise resolving to investment details

### `sdk.getConfigInfo()`

Get information about the current SDK configuration.

- Returns: Object with network, currentIndexer, availableIndexers, and timestamp
