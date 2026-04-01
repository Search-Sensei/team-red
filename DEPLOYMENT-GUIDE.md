# Deployment Guide - Admin UI

> **Source**: Content from [Google Docs - SearchSensei Deploy to Linux](https://docs.google.com/document/d/1F1swebqVao-s1Ic_S4eL2LFh6ileS3ftO7X_ZycbXQI/edit?usp=sharing)
> 
> **Note**: Please copy the Admin UI-specific sections from the Google Docs and add them below.

---

## Configuration

### Environment Variables for Azure App Service

Add the following environment variables to Azure App Service `osp-search-ai-adminui`:

```bash
ASPNETCORE_ENVIRONMENT = Production
AdminSettings__SearchApiUrl = https://osp-search-ai-api-erhudve5cqeagne6.australiaeast-01.azurewebsites.net/
AdminSettings__ApplicationTitle = S365 Search Administration
```

### appsettings.Production.json

Ensure configuration points to correct API:

```json
{
  "AdminSettings": {
    "SearchApiUrl": "https://osp-search-ai-api-erhudve5cqeagne6.australiaeast-01.azurewebsites.net/",
    "SearchAdminApiUrl": "/adminui"
  }
}
```
