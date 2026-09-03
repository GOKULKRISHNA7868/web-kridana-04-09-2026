import React from "react";
import MyAccountLayout from "../InstituteDashboard/MyAccount/MyAccountLayout";
import { actorFromStaff } from "../../utils/trainerAccess";

const InstituteStaffProfile = ({ staffProfile }) => (
  <div className="h-full min-h-0">
    <MyAccountLayout
      instituteId={staffProfile?.instituteId}
      actor={actorFromStaff(staffProfile)}
    />
  </div>
);

export default InstituteStaffProfile;
