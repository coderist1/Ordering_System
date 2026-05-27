"""Resolve the best public URL for a product image."""


def product_image_url(product, request=None):
    if product.image:
        url = product.image.url
        if url.startswith('http://') or url.startswith('https://'):
            return url
        if request is not None:
            return request.build_absolute_uri(url)
        backend = __import__('django.conf', fromlist=['settings']).settings
        base = getattr(backend, 'BACKEND_URL', '').rstrip('/')
        if base:
            return f"{base}{url}" if url.startswith('/') else f"{base}/{url}"
        return url

    image_url = (getattr(product, 'image_url', None) or '').strip()
    return image_url or None
