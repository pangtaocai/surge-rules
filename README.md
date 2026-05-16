# surge-rules

Personal Surge rules and profile.

## Files

- `Surge.conf`: Main Surge profile for macOS and iOS.
- `rules/DNSDirect.list`: Domestic encrypted DNS endpoints routed directly.
- `rules/DNSProxy.list`: Overseas encrypted DNS endpoints and encrypted DNS protocols routed by proxy.
- `rules/DomesticCustom.list`: Custom domestic services routed directly.

## Raw URLs

```conf
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/refs/heads/main/rules/DNSDirect.list,直连
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/refs/heads/main/rules/DNSProxy.list,节点选择
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/refs/heads/main/rules/DomesticCustom.list,直连
```
