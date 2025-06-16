---
name: 🗄️ Database Migration
about: Database schema changes and migrations using Drizzle ORM
title: '[DB] '
labels: ['database', 'migration', 'drizzle', 'needs-triage']
assignees: ''
---

## Migration Overview

A clear description of the database changes needed.

## Migration Type

- [ ] 🆕 **New Table** - Creating a new table
- [ ] 📝 **Schema Update** - Modifying existing table structure
- [ ] 🔗 **Relationships** - Adding/modifying foreign keys or relations
- [ ] 📊 **Data Migration** - Moving or transforming existing data
- [ ] 🗑️ **Deprecation** - Removing columns/tables
- [ ] 📈 **Performance** - Indexes, optimizations
- [ ] 🔧 **Maintenance** - Cleanup, constraints, triggers

## Feature Context

**What feature/functionality requires this database change?**

- Related to: [ ] Scheduling / [ ] Mentorship / [ ] Authentication / [ ] User Management / [ ] Other: **\_\_**

## Schema Changes

### Tables Affected

- [ ] users
- [ ] events
- [ ] bookings
- [ ] mentorships
- [ ] availability
- [ ] Other: **\_\_**

### New Schema (if applicable)

```sql
-- Drizzle schema definition
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  // ... other columns
});
```

### Migration SQL (if complex)

```sql
-- SQL commands that will be generated
ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
-- etc.
```

## Data Migration Requirements

- [ ] **No data migration needed** - Safe schema-only changes
- [ ] **Simple data migration** - Can be handled automatically
- [ ] **Complex data migration** - Requires custom logic/scripts
- [ ] **Data backfill needed** - Populate new columns with computed values

### Data Migration Strategy (if applicable)

Describe how existing data should be handled:

```typescript
// Example data transformation logic
```

## Breaking Changes Impact

- [ ] **Non-breaking** - Additive changes only
- [ ] **Potentially breaking** - Might affect existing queries
- [ ] **Breaking** - Will require application code changes

### If breaking, list affected areas:

- [ ] API endpoints
- [ ] Component queries
- [ ] Server actions
- [ ] Background jobs
- [ ] Other: **\_\_**

## Environment Rollout Plan

- [ ] **Local Development** - Test locally first
- [ ] **Preview Environment** - Deploy to staging
- [ ] **Production** - Production deployment strategy

### Deployment Strategy

- [ ] **Standard deployment** - Can be deployed normally
- [ ] **Coordinated deployment** - Requires app code changes first
- [ ] **Blue-green deployment** - Requires careful coordination
- [ ] **Rollback plan needed** - Complex changes requiring rollback strategy

## Performance Considerations

- [ ] **Indexes needed** - Specify which columns need indexing
- [ ] **Large table impact** - Changes affecting tables with >1M rows
- [ ] **Query performance** - Potential impact on existing queries
- [ ] **Migration duration** - Expected time for migration to complete

### Performance Notes

Estimated migration time and any performance impacts:

## Testing Requirements

- [ ] **Unit tests** - Update/add tests for new schema
- [ ] **Integration tests** - Test with application code
- [ ] **Load testing** - Performance testing if applicable
- [ ] **Data integrity verification** - Ensure data consistency

## Rollback Plan

**How can this migration be safely rolled back if needed?**

- [ ] **Automatically reversible** - Drizzle can auto-generate rollback
- [ ] **Manual rollback** - Custom rollback script needed
- [ ] **Data loss potential** - Cannot be safely rolled back

### Rollback Script (if needed)

```sql
-- SQL commands to rollback changes
```

## Dependencies

- **Blocked by**: List any issues that must be resolved first
- **Blocks**: List any issues that depend on this migration
- **Related PRs**: Link any related pull requests

## Security Considerations

- [ ] **No security impact**
- [ ] **New sensitive data** - PII, authentication data, etc.
- [ ] **Permission changes** - Row-level security, access controls
- [ ] **Encryption needed** - Specify columns requiring encryption

## Documentation Updates

- [ ] Schema documentation
- [ ] API documentation updates
- [ ] Developer setup instructions
- [ ] Production runbook updates

## Verification Steps

Steps to verify the migration was successful:

1. [ ] Schema changes applied correctly
2. [ ] Data integrity maintained
3. [ ] Application functions normally
4. [ ] Performance metrics within acceptable range
5. [ ] No error logs related to migration

## Checklist

- [ ] I have considered the impact on existing data
- [ ] I have planned for rollback scenarios
- [ ] I have considered performance implications
- [ ] I have identified all affected application code
- [ ] I have specified testing requirements
