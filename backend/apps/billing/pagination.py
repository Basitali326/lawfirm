from rest_framework.pagination import PageNumberPagination
from core.responses import api_success


class BillingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        meta = {
            "page": self.page.number,
            "page_size": self.page.paginator.per_page,
            "total": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "has_next": self.page.has_next(),
            "has_prev": self.page.has_previous(),
        }
        return api_success("OK", data=data, meta=meta)
