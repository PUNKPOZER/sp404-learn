from translator.sp404 import content, i18n


def test_python_reads_the_same_content_the_ui_ships():
    items = content.load_all()
    ids = {i["id"] for i in items}
    assert {"skip-back", "tr-rec", "djfx-looper", "filter-drive"} <= ids
    assert all(content.publishable(i) for i in items)          # nothing unverified is shipped as content today
    for i in items:
        assert i["title"]["ru"] and i["title"]["en"], i["id"]


def test_loc_follows_the_language_and_falls_back_to_russian():
    i18n.set_lang("en")
    try:
        assert content.loc(content.get("skip-back")["title"]).startswith("Skip Back")
        assert content.loc({"ru": "а", "en": ""}) == "а"
    finally:
        i18n.set_lang("ru")
    assert "поймать" in content.loc(content.get("skip-back")["title"])
    assert content.loc("plain") == "plain"
