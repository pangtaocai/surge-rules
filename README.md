# surge-rules

Personal Surge rules and profile.

## Files

- `Surge.conf`: Main Surge profile for macOS and iOS.
- `rule/DNSDirect.list`: Domestic encrypted DNS endpoints routed directly.
- `rule/DNSProxy.list`: Overseas encrypted DNS endpoints and encrypted DNS protocols routed by proxy.
- `rule/DomesticCustom.list`: Custom domestic services routed directly.

## Raw URLs

```conf
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DNSDirect.list,直连
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DNSProxy.list,节点选择
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DomesticCustom.list,直连
```
