import ContentCrud from "@/components/website/admin/ContentCrud";

export default function EbookSalesAdminPage() {
  return (
    <ContentCrud
      title="E-Book Sales"
      endpoint="/api/v1/ebook-purchases/"
      fields={[]}
      readOnly
      columns={[
        "ebook_title",
        "buyer_name",
        "buyer_email",
        "seller_name",
        {
          name: "amount_aed",
          label: "Amount (AED)",
          format: "currency-aed",
        },
        "status",
        { name: "created_at", label: "Created At (Dubai)" },
      ]}
    />
  );
}
