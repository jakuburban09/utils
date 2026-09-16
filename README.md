# utils

Moderní sada praktických kalkulaček: náklady na cestu, převod měn, úvěry a investování.

## Lokální spuštění

```bash
npm install
npm run dev
```

## Nasazení

Push do větve `master` spustí GitHub Actions workflow, který aplikaci sestaví a nahraje na `/www/subdom/utils/`.

V GitHub repository nastavte secrets `FTP_SERVER`, `FTP_USERNAME` a `FTP_PASSWORD` se stejnými hodnotami jako u projektu `recipes`. GitHub secrets mezi repozitáři nelze z bezpečnostních důvodů zkopírovat automaticky.
