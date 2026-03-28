from common.pagination import DefaultPageNumberPagination


class EcommercePagination(DefaultPageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

