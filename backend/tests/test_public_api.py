import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

@pytest.fixture(scope='module')
def client():
    return requests.Session()

def test_root(client):
    r = client.get(f'{BASE_URL}/api/')
    assert r.status_code == 200
    assert r.json() == {'message': 'Mahawar Sabha API', 'version': 'phase-1'}

def test_locations(client):
    r = client.get(f'{BASE_URL}/api/locations')
    assert r.status_code == 200
    data = r.json()['locations']
    assert {x['slug'] for x in data} == {'mathura', 'rewari'}

def test_location_details(client):
    for slug, status in [('mathura', 'launch-ready'), ('rewari', 'placeholder')]:
        r = client.get(f'{BASE_URL}/api/locations/{slug}')
        assert r.status_code == 200
        assert r.json()['city'].lower() == slug
        assert r.json()['status'] == status

def test_unknown_location(client):
    r = client.get(f'{BASE_URL}/api/locations/unknown')
    assert r.status_code == 200
    assert r.json()['error'] == 'Location not found'
