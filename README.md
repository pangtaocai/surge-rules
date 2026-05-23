# surge-rules

Personal Surge rules and profile.

## Files

- `Surge.conf`: Main Surge profile for macOS and iOS.
- `rule/DNSDirect.list`: Optional domestic encrypted DNS endpoints.
- `rule/DNSProxy.list`: Optional overseas encrypted DNS endpoints and encrypted DNS protocols.
- `rule/DomesticCustom.list`: Custom domestic services routed directly.
- `script/traffic.js`: Surge generic script for airport subscription traffic monitoring.
- `icon/*.png`: Policy group icon assets.

## Raw URLs

```conf
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DomesticCustom.list,DIRECT
```

```conf
traffic = type=generic,timeout=30,debug=true,script-path=https://raw.githubusercontent.com/pangtaocai/surge-rules/master/script/traffic.js,script-update-interval=86400,argument=name=我的机场;url=你的机场订阅地址;warn=80;expire=7
```

## Icon Sources

- Brand icons: [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons)
- Country and region flags: [flag-icons](https://github.com/lipis/flag-icons)
- Generic policy icons: [Lucide](https://github.com/lucide-icons/lucide)
