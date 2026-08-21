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


# ---- Local FastAPI stub ----
def test_local_stub_health(client):
    r = client.get('http://localhost:8001/health')
    assert r.status_code == 200
    assert r.json() == {'ok': True}


def test_local_stub_api_root(client):
    r = client.get('http://localhost:8001/api/')
    assert r.status_code == 200
    body = r.json()
    assert body['runtime'] == 'stub'
    assert 'backend' in body


# ---- Railway root ----
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


# ---- Admin media: status (public) ----
def test_media_status_configured(client):
    r = client.get(f'{BASE_URL}/api/admin/media/status')
    assert r.status_code == 200
    body = r.json()
    assert body['configured'] is True
    assert body['bucket'] == 'mahawar-sabha'
    assert body['limits']['imageMaxBytes'] == 10485760
    assert body['limits']['documentMaxBytes'] == 15728640


# ---- Admin media: auth ----
def test_media_list_unauthorized(client):
    r = client.get(f'{BASE_URL}/api/admin/media?location=mathura&category=gallery')
    assert r.status_code == 401
    assert r.json()['code'] == 'UNAUTHORIZED'


def test_media_list_authorized(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=mathura&category=gallery',
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body['configured'] is True
    assert isinstance(body['files'], list)


def test_media_list_invalid_scope(client, auth_headers):
    r = client.get(
        f'{BASE_URL}/api/admin/media?location=delhi&category=gallery',
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


# ---- Admin media: upload / download / delete round-trip ----
_MIN_JPEG = bytes.fromhex(
    'ffd8ffe000104a46494600010100000100010000'
    'ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a'
    '1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432'
    'ffc0000b080001000101011100'
    'ffc4001f0000010501010101010100000000000000000102030405060708090a0b'
    'ffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa'
    'ffda0008010100003f00fb'
    'ffd9'
)


def test_media_upload_download_delete_roundtrip(client, auth_headers):
    files = {'file': ('test.jpg', io.BytesIO(_MIN_JPEG), 'image/jpeg')}
    data = {'location': 'mathura', 'category': 'gallery'}
    up = client.post(
        f'{BASE_URL}/api/admin/media/upload',
        headers=auth_headers,
        files=files,
        data=data,
    )
    assert up.status_code == 201, up.text
    body = up.json()
    asset = body.get('file') or body.get('asset') or body
    asset_id = asset.get('id') or asset.get('_id')
    assert asset_id, f'no id in upload response: {body}'
    assert '_id' not in up.text
    assert '__v' not in up.text

    # Download
    dl = client.get(f'{BASE_URL}/api/admin/media/{asset_id}/download', headers=auth_headers)
    assert dl.status_code == 200
    assert len(dl.content) > 0

    # Delete
    de = client.delete(f'{BASE_URL}/api/admin/media/{asset_id}', headers=auth_headers)
    assert de.status_code in (204, 200)
