import os
import time
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_TOKEN = 'mahawar-admin-dev-token'
AUTH = {'Authorization': f'Bearer {ADMIN_TOKEN}'}


@pytest.fixture(scope='module')
def client():
    return requests.Session()


@pytest.fixture(scope='module')
def created_ids():
    return []


def _cleanup(client, ids):
    for i in ids:
        try:
            client.delete(f'{BASE_URL}/api/admin/stories/{i}', headers=AUTH)
        except Exception:
            pass


# ---- Root regression ----
def test_root_runtime_node(client):
    r = client.get(f'{BASE_URL}/api/')
    assert r.status_code == 200
    assert r.json().get('runtime') == 'node'


# ---- PUBLIC: list ----
def test_public_stories_mathura(client):
    r = client.get(f'{BASE_URL}/api/stories?location=mathura')
    assert r.status_code == 200
    body = r.json()
    assert 'stories' in body
    assert isinstance(body['stories'], list)
    for s in body['stories']:
        assert s.get('published') is True
        assert 'body' not in s  # body must be omitted from list
        assert '_id' not in s
        assert '__v' not in s


def test_public_stories_invalid_location(client):
    r = client.get(f'{BASE_URL}/api/stories?location=delhi')
    assert r.status_code == 400
    assert r.json().get('code') == 'INVALID_LOCATION'


# ---- PUBLIC: detail ----
def test_public_story_unknown_slug_404(client):
    r = client.get(f'{BASE_URL}/api/stories/does-not-exist-slug-xyz')
    assert r.status_code == 404


def test_public_story_cover_404_when_no_asset(client):
    # Seed story slug (per task info)
    r = client.get(f'{BASE_URL}/api/stories/diwali-in-the-old-sabha-courtyard/cover')
    assert r.status_code == 404


# ---- ADMIN: auth ----
def test_admin_list_requires_token(client):
    r = client.get(f'{BASE_URL}/api/admin/stories?location=mathura')
    assert r.status_code == 401


def test_admin_list_ok(client):
    r = client.get(f'{BASE_URL}/api/admin/stories?location=mathura', headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert 'stories' in body
    for s in body['stories']:
        assert '_id' not in s
        assert '__v' not in s


# ---- ADMIN: create ----
def test_admin_create_missing_fields(client):
    r = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json={'title': 'Only title'})
    assert r.status_code == 400
    assert r.json().get('code') == 'MISSING_FIELDS'


def test_admin_create_and_slug_uniqueness(client, created_ids):
    payload = {
        'title': 'TEST Heritage Story Alpha',
        'body': 'This is a lovely test body of the story with plenty of content.',
        'author': 'Test Author',
        'tags': ['heritage', 'test'],
        'published': True,
        'location': 'mathura',
    }
    r1 = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json=payload)
    assert r1.status_code == 201
    s1 = r1.json()['story']
    assert s1['title'] == payload['title']
    assert s1['slug'] == 'test-heritage-story-alpha'
    assert s1['published'] is True
    assert s1.get('publishedAt')
    assert '_id' not in s1 and '__v' not in s1
    created_ids.append(s1['id'])

    # Second with same title -> slug-2
    r2 = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json=payload)
    assert r2.status_code == 201
    s2 = r2.json()['story']
    assert s2['slug'] == 'test-heritage-story-alpha-2'
    created_ids.append(s2['id'])

    # Verify persistence via public detail (published)
    rd = client.get(f'{BASE_URL}/api/stories/{s1["slug"]}')
    assert rd.status_code == 200
    assert 'body' in rd.json()['story']


def test_admin_create_draft_returns_404_public(client, created_ids):
    payload = {
        'title': 'TEST Draft Story',
        'body': 'Draft body content here.',
        'published': False,
    }
    r = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json=payload)
    assert r.status_code == 201
    s = r.json()['story']
    assert s['published'] is False
    assert not s.get('publishedAt')
    created_ids.append(s['id'])
    # Public should NOT expose it
    pub = client.get(f'{BASE_URL}/api/stories/{s["slug"]}')
    assert pub.status_code == 404


# ---- ADMIN: update ----
def test_admin_update_toggle_publish_and_retitle(client, created_ids):
    payload = {'title': 'TEST Updatable Story', 'body': 'Original body.', 'published': False}
    r = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json=payload)
    assert r.status_code == 201
    s = r.json()['story']
    created_ids.append(s['id'])
    assert not s.get('publishedAt')

    # Publish
    r2 = client.put(
        f'{BASE_URL}/api/admin/stories/{s["id"]}',
        headers=AUTH,
        json={'published': True, 'title': 'TEST Updatable Story Renamed', 'tags': ['a', 'b']},
    )
    assert r2.status_code == 200
    s2 = r2.json()['story']
    assert s2['published'] is True
    assert s2.get('publishedAt')
    assert s2['slug'] == 'test-updatable-story-renamed'
    assert s2['tags'] == ['a', 'b']

    # Unpublish
    r3 = client.put(
        f'{BASE_URL}/api/admin/stories/{s["id"]}',
        headers=AUTH,
        json={'published': False},
    )
    assert r3.status_code == 200
    assert r3.json()['story']['published'] is False


# ---- ADMIN: delete ----
def test_admin_delete_soft(client):
    payload = {'title': 'TEST Delete Me', 'body': 'gone soon', 'published': True}
    r = client.post(f'{BASE_URL}/api/admin/stories', headers=AUTH, json=payload)
    sid = r.json()['story']['id']
    slug = r.json()['story']['slug']

    d = client.delete(f'{BASE_URL}/api/admin/stories/{sid}', headers=AUTH)
    assert d.status_code == 204

    # Public detail is 404
    pub = client.get(f'{BASE_URL}/api/stories/{slug}')
    assert pub.status_code == 404

    # Admin GET by id is 404
    ag = client.get(f'{BASE_URL}/api/admin/stories/{sid}', headers=AUTH)
    assert ag.status_code == 404


# ---- Final cleanup ----
def test_zzz_cleanup(client, created_ids):
    _cleanup(client, created_ids)
