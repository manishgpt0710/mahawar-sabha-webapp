import os
import io
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_TOKEN = 'mahawar-admin-dev-token'


@pytest.fixture(scope='module')
def client():
    return requests.Session()


@pytest.fixture(scope='module')
def auth_headers():
    return {'Authorization': f'Bearer {ADMIN_TOKEN}'}


# ---- Root ----
def test_root_is_node(client):
    r = client.get(f'{BASE_URL}/api/')
    assert r.status_code == 200
    body = r.json()
    assert body['message'] == 'Mahawar Sabha API'
    assert body['runtime'] == 'node'


# ---- Locations (Phase 1 regression) ----
def test_locations_list(client):
    r = client.get(f'{BASE_URL}/api/locations')
    assert r.status_code == 200
    slugs = {x['slug'] for x in r.json()['locations']}
    assert slugs == {'mathura', 'rewari'}


def test_location_details(client):
    for slug, status in [('mathura', 'launch-ready'), ('rewari', 'placeholder')]:
        r = client.get(f'{BASE_URL}/api/locations/{slug}')
        assert r.status_code == 200
        body = r.json()
        assert body['slug'] == slug
        assert body['status'] == status


def test_unknown_location_returns_404(client):
    r = client.get(f'{BASE_URL}/api/locations/unknown')
    assert r.status_code == 404
    body = r.json()
    assert body['error'] == 'Location not found'
    assert set(body['available']) == {'mathura', 'rewari'}


# ---- Admin media: status (public) ----
def test_media_status_public(client):
    r = client.get(f'{BASE_URL}/api/admin/media/status')
    assert r.status_code == 200
    body = r.json()
    assert body['configured'] is False
    assert body['bucket'] is None
    assert body['limits']['imageMaxBytes'] == 10485760
    assert body['limits']['documentMaxBytes'] == 15728640


# ---- Admin media: list ----
def test_media_list_unauthorized(client):
    r = client.get(f'{BASE_URL}/api/admin/media?location=mathura&category=gallery')
    assert r.status_code == 401
    assert r.json()['code'] == 'UNAUTHORIZED'


def test_media_list_authorized_empty(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=mathura&category=gallery',
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body['files'] == []
    assert body['configured'] is False


def test_media_list_invalid_scope(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=delhi&category=gallery',
        headers=auth_headers,
    )
    assert r.status_code == 400
    assert r.json()['code'] == 'INVALID_SCOPE'


def test_media_list_invalid_category(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=mathura&category=videos',
        headers=auth_headers,
    )
    assert r.status_code == 400
    assert r.json()['code'] == 'INVALID_SCOPE'


def test_media_list_wrong_token(client):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=mathura&category=gallery',
        headers={'Authorization': 'Bearer wrong-token'},
    )
    assert r.status_code == 401


def test_media_list_x_admin_token_header(client):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=rewari&category=documents',
        headers={'x-admin-token': ADMIN_TOKEN},
    )
    assert r.status_code == 200


# ---- Admin media: upload ----
def test_upload_no_token(client):
    r = client.post(f'{BASE_URL}/api/admin/media/upload')
    assert r.status_code == 401


def test_upload_storage_not_configured(client, auth_headers):
    # Middleware order: adminOnly then requireStorage. Even before file parsing,
    # requireStorage should short-circuit with 503.
    files = {'file': ('a.txt', io.BytesIO(b'hello'), 'text/plain')}
    data = {'location': 'mathura', 'category': 'gallery'}
    r = client.post(
        f'{BASE_URL}/api/admin/media/upload',
        headers=auth_headers,
        files=files,
        data=data,
    )
    assert r.status_code == 503
    assert r.json()['code'] == 'STORAGE_NOT_CONFIGURED'


# ---- Admin media: delete ----
def test_delete_no_token(client):
    r = client.delete(f'{BASE_URL}/api/admin/media/some-id')
    assert r.status_code == 401


def test_delete_with_token_storage_not_configured(client, auth_headers):
    r = client.delete(
        f'{BASE_URL}/api/admin/media/some-id',
        headers=auth_headers,
    )
    assert r.status_code == 503
    assert r.json()['code'] == 'STORAGE_NOT_CONFIGURED'


# ---- Response hygiene: no _id / __v ----
def test_media_list_no_mongo_internals(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=mathura&category=gallery',
        headers=auth_headers,
    )
    text = r.text
    assert '"_id"' not in text
    assert '"__v"' not in text
