

## Add New Module: "Vault OS Supply and Demand Indicator: Setup (Only)"

### What will happen

Insert a new module into the Learn page as **Chapter 2**, shifting all current chapters (2–10) down by one position. The module subtitle will include the TradingView installation link.

### Database changes

Using the insert tool (data operation, not schema change):

1. **Bump existing modules** at sort_order >= 2 up by 1
2. **Insert new module** at sort_order 2:
   - **Title**: `Vault OS Supply and Demand Indicator: Setup (Only)`
   - **Slug**: `vault-os-supply-demand-setup`
   - **Subtitle**: `Install the Vault Supply & Demand indicator on TradingView: https://www.tradingview.com/script/S5XeIM2m-Vault-Trading-Academy-Supply-And-Demand/`
   - **sort_order**: 2
   - **visible**: true

### No code changes needed

The Learn page already renders modules dynamically from the database. The new module will appear automatically after the data insert.

### Files

| Target | Change |
|--------|--------|
| `academy_modules` table | Reorder existing rows, insert new Chapter 2 |

