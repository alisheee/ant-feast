# Ant Feast 🐜

Піксельна головоломка для Telegram Mini App: тапай плитки, мурахи їдять картинку знизу вгору.

- `index.html`: сама гра (читає рівні з `levels/`)
- `levels/`: рівні (`index.json` визначає порядок і складність: easy / mid / hard)
- `tools/pixelate.py`: перетворює картинки з `foto/` на рівні в `output/`

Новий рівень: запусти `tools/pixelate.py`, скопіюй `.json` з `output/` у `levels/` і додай рядок у `levels/index.json`.
Тест із завантаженням власних JSON: відкрий гру з `?dev` в кінці адреси.
