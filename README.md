# surge-rules

Personal Surge rules and profile.

## Files

- `Surge.conf`: Main Surge profile for macOS and iOS.
- `rule/DNSDirect.list`: Optional domestic encrypted DNS endpoints.
- `rule/DNSProxy.list`: Optional overseas encrypted DNS endpoints and encrypted DNS protocols.
- `rule/DomesticCustom.list`: Custom domestic services routed directly.
- `script/airport-traffic-monitor.js`: Surge cron script for airport subscription traffic monitoring.
- `module/airport-traffic-monitor.sgmodule`: Surge module wrapper for the traffic monitor script.
- `icon/*.png`: Policy group icon assets.

## Raw URLs

```conf
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DomesticCustom.list,DIRECT
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/airport-traffic-monitor.sgmodule
```

## Icon Sources

- Brand icons: [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons)
- Country and region flags: [flag-icons](https://github.com/lipis/flag-icons)
- Generic policy icons: [Lucide](https://github.com/lucide-icons/lucide)
