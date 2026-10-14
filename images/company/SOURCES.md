# Фото страницы «О компании»

Все фото на этой странице — иллюстративные, не съёмки FBL Group. Пометка «Иллюстративное фото» и строка источников под галереей формируются из `site/images/photos.json` инструментом `tools/sync_partials.py`; менять её вручную в HTML не нужно.

Когда появятся реальные фото FBL (офис, склады, команда): положить файл с тем же именем и путём (проще всего) или изменить `src` в `photos.json`, поставить `"illustrative": false` и `"credit": null` для этой записи, запустить `python3 tools/sync_partials.py`.

## Unsplash (бесплатная лицензия, не Unsplash+)

Лицензия: можно использовать бесплатно, в том числе в коммерческих целях, без обязательного указания автора; текст — https://unsplash.com/license

| Файл | Автор | Страница фото |
|---|---|---|
| company/hero.jpg | Timelab | https://unsplash.com/photos/container-ship-at-industrial-port-yx20mpDyr2I |
| company/office/office.jpg | Nastuh Abootalebi | https://unsplash.com/photos/photo-of-dining-table-and-chairs-inside-room-eHD8Y1Znfpk |
| company/office/workspace.jpg | PHC Software | https://unsplash.com/photos/an-office-with-a-bike-parked-in-the-middle-of-the-room-7G6J0eXlmX0 |
| company/office/negotiations.jpg | Carrie Allen | https://unsplash.com/photos/a-man-and-a-woman-sitting-at-a-white-table-1H1LBKvD7ew |
| company/office/process.jpg | Scott Graham | https://unsplash.com/photos/person-holding-pencil-near-laptop-computer-5fNmWej4tAA |
| company/office/at-work.jpg | Ant Rozetsky | https://unsplash.com/photos/person-sitting-beside-table-HXOllTSwrpM |
| company/office/meeting-rooms.jpg | Hammer Group | https://unsplash.com/photos/a-glass-walled-meeting-room-with-a-table-and-chairs-fxIcYymZHJg |
| company/team/team-1.jpg | Reproductive Health Supplies Coalition | https://unsplash.com/photos/standing-man-in-orange-t-shirt-holding-white-box-1Bsqy0meA88 |
| company/team/team-2.jpg | Hans Westbeek | https://unsplash.com/photos/hands-using-a-digital-caliper-to-measure-metal-part-_luiFaaZU6k |
| company/team/team-3.jpg | Compagnons | https://unsplash.com/photos/a-person-holding-a-brown-paper-bag-on-top-of-a-table-mErtCMDgUEM |
| company/team/team-4.jpg | Burst | https://unsplash.com/photos/person-typing-on-silver-macbook-kUqqaRjJuw0 |
| company/logistics/containers-aerial.jpg | CHUTTERSNAP | https://unsplash.com/photos/aerial-view-of-shipping-container-yard-9cCeS9Sg6nU |
| company/warehouses/shelves.jpg | CHUTTERSNAP | https://unsplash.com/photos/brown-cardboard-boxes-on-white-metal-rack-BNBA1h-NgdY |
| company/logistics/trucks.jpg | Marcin Jozwiak | https://unsplash.com/photos/parked-trucks-kGoPcmpPT7c |
| company/production.jpg | Homa Appliances | https://unsplash.com/photos/a-large-machine-in-a-large-building-pWUyHVJgLhg |
| company/logistics/fulfillment.jpg | EqualStock | https://unsplash.com/photos/a-woman-organizes-items-in-a-warehouse-VwYuxvsAZg0 |
| company/city.jpg | Wally Yang | https://unsplash.com/photos/city-skyline-during-night-time-8HzjyDDgbJg |
| company/factory-line.jpg | Arno Senoner | https://unsplash.com/photos/a-group-of-men-in-a-factory-oLS6IxceVNs |
| company/warehouses/foshan.jpg | Marcin Jozwiak | https://unsplash.com/photos/aerial-view-of-vehicles-in-parking-area-oh0DITWoHi4 |

## Wikimedia Commons (снимки конкретных городов)

Уменьшены по размеру (изменение файла разрешено этими лицензиями), обрезка не менялась.

| Файл | Автор | Лицензия | Страница файла |
|---|---|---|---|
| company/warehouses/guangzhou.jpg | Tim Wu | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Aerial_View_of_Phase_I,_Guangzhou_International_Port_20231224-C.jpg |
| company/warehouses/yiwu.jpg | iamdanw (Flickr) | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Yiwu_International_Trade_Mart_-_District_3,_Gate_59.jpg |
| company/yiwu-goods.jpg | iamdanw (Flickr) | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Tourist_goods_in_Yiwu_International_Trade_Mart.jpg |

## Карта

`site/images/map/china-southeast-dots.svg` — точки суши юго-восточного Китая, сгенерированы из Natural Earth 1:50m land (общественное достояние, https://www.naturalearthdata.com/about/terms-of-use/) скриптом на этапе сборки; в SVG нет государственных границ, только береговая линия.
