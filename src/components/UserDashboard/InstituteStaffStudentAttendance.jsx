import React from "react";
import StudentsAttendancePage from "../InstituteDashboard/StudentsAttendancePage";
import { actorFromStaff } from "../../utils/trainerAccess";

const InstituteStaffStudentAttendance = ({ staffProfile }) => (
  <div className="h-full min-h-0">
    <StudentsAttendancePage
      instituteId={staffProfile?.instituteId}
      actor={actorFromStaff(staffProfile)}
    />
  </div>
);

export default InstituteStaffStudentAttendance;
