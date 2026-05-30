# surge-rules

Personal Surge rules and profile.

## Files

- `Surge.conf`: Main Surge profile for macOS and iOS.
- `rule/DNSDirect.list`: Optional domestic encrypted DNS endpoints.
- `rule/DNSProxy.list`: Optional overseas encrypted DNS endpoints and encrypted DNS protocols.
- `rule/DomesticCustom.list`: Custom domestic services routed directly.
- `script/traffic.js`: Surge panel script for airport subscription traffic monitoring.
- `module/traffic.sgmodule`: Remote-importable Surge iOS panel module for the traffic monitor script.
- `script/proxy-info-panel.js`: Surge panel script for proxy/local IP and exit IP monitoring.
- `script/network-pro-panel.js`: Surge text panel converted from the Egern Network-Pro widget script.
- `module/proxy-info-panel.sgmodule`: Remote-importable Surge iOS panel module for the proxy information panel.
- `module/proxy-panel.sgmodule`: Short remote-importable alias for the proxy information panel.
- `module/proxy-panel-v2.sgmodule`: Current proxy information panel module with static fallback title/content.
- `module/proxy-info-fixed.sgmodule`: Conservative fixed proxy information panel module with no module placeholders.
- `module/proxy-info-configurable.sgmodule`: Configurable proxy information panel module using Surge official `%KEY%` module variables.
- `module/network-pro-panel.sgmodule`: Fixed Network-Pro diagnostic panel module.
- `module/network-pro-panel-configurable.sgmodule`: Configurable Network-Pro diagnostic panel module using Surge official `%KEY%` module variables.
- `icon/*.png`: Policy group icon assets.

## Raw URLs

```conf
RULE-SET,https://raw.githubusercontent.com/pangtaocai/surge-rules/master/rule/DomesticCustom.list,DIRECT
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/traffic.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-info-panel.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-panel.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-panel-v2.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-info-fixed.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-info-configurable.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/network-pro-panel.sgmodule
```

```conf
https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/network-pro-panel-configurable.sgmodule
```

Module arguments follow Surge's `KEY:Description` format. Encode the airport subscription URL before filling `URL`.

## Icon Sources

- Brand icons: [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons)
- Country and region flags: [flag-icons](https://github.com/lipis/flag-icons)
- Generic policy icons: [Lucide](https://github.com/lucide-icons/lucide)
