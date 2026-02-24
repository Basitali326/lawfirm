export const endpoints = {
  register: "/api/authx/register-firm/",
  login: "/api/authx/login/",
  logout: "/api/authx/logout/",
  refresh: "/api/authx/token/refresh/",
  firmProfile: "/api/firms/profile/",
  casesList: "/api/v1/cases/",
  casesCreate: "/api/v1/cases/",
  trashList: "/api/v1/trash/",
  trashRestore: "/api/v1/trash/",
  hearingsList: "/api/v1/hearings/",
  hearingsByCase: (caseId) => `/api/v1/cases/${caseId}/hearings/`,
  hearingDetail: (id) => `/api/v1/hearings/${id}/`,
};
