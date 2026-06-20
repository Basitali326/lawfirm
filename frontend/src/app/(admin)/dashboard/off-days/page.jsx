import ContentCrud from "@/components/website/admin/ContentCrud";

export default function OffDaysPage() {
  return <ContentCrud title="Lawyer Off Days" endpoint="/api/v1/lawyer-off-days/" fields={[
    { name: "date", label: "Off date", type: "date", required: true },
    { name: "reason", label: "Reason", type: "text" },
    { name: "is_all_day", label: "All day", type: "checkbox", defaultValue: true },
    { name: "start_time", label: "Start time (partial day)", type: "time", nullable: true },
    { name: "end_time", label: "End time (partial day)", type: "time", nullable: true },
    { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
  ]} columns={[
    { name: "date", label: "Date" },
    { name: "lawyer_name", label: "Lawyer" },
    { name: "reason", label: "Reason" },
    { name: "is_all_day", label: "All day" },
    { name: "start_time", label: "From" },
    { name: "end_time", label: "To" },
  ]} />;
}
