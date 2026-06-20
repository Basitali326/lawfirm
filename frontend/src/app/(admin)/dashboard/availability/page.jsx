import ContentCrud from "@/components/website/admin/ContentCrud";

const weekdays = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export default function AvailabilityPage() {
  return <ContentCrud title="Lawyer Weekly Availability" endpoint="/api/v1/lawyer-availability/" fields={[
    { name: "weekday", label: "Weekday", type: "select", options: weekdays, defaultValue: 0, required: true },
    { name: "start_time", label: "Start time", type: "time", defaultValue: "09:00", required: true },
    { name: "end_time", label: "End time", type: "time", defaultValue: "17:00", required: true },
    { name: "slot_duration_minutes", label: "Default slot minutes", type: "number", defaultValue: 60, required: true },
    { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
  ]} columns={[
    { name: "weekday_name", label: "Day" },
    { name: "lawyer_name", label: "Lawyer" },
    { name: "start_time", label: "Starts" },
    { name: "end_time", label: "Ends" },
    { name: "slot_duration_minutes", label: "Slot minutes" },
    { name: "is_active", label: "Active" },
  ]} />;
}
