"use client";

import React, { type FC } from "react";
import styles from "~/styles/Employer/Settings.module.css";

interface SettingsFormProps {
    // Display-only fields
    displayName: string;
    email: string;

    // Editable fields
    companyName: string;
    employerPasskey: string;
    employeePasskey: string;
    staffCount: string;

    // State flags
    isSaving: boolean;

    // Callbacks for updating parent state
    onCompanyNameChange: (value: string) => void;
    onEmployerPasskeyChange: (value: string) => void;
    onEmployeePasskeyChange: (value: string) => void;
    onStaffCountChange: (value: string) => void;

    // Callback for saving
    onSave: () => void;
}

const SettingsForm: FC<SettingsFormProps> = ({
                                                 displayName,
                                                 email,
                                                 companyName,
                                                 employerPasskey,
                                                 employeePasskey,
                                                 staffCount,
                                                 isSaving,
                                                 onCompanyNameChange,
                                                 onEmployerPasskeyChange,
                                                 onEmployeePasskeyChange,
                                                 onStaffCountChange,
                                                 onSave,
                                             }) => {
    return (
        <div className={styles.settingsContainer}>
            <h1 className={styles.settingsTitle}>Settings</h1>

            {/* Display Name */}
            <div className={styles.formGroup}>
                <label htmlFor="displayName" className={styles.label}>
                    Display Name
                </label>
                <input
                    id="displayName"
                    type="text"
                    className={styles.input}
                    value={displayName}
                    disabled
                />
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    className={styles.input}
                    value={email}
                    disabled
                />
            </div>

            {/* Company Name */}
            <div className={styles.formGroup}>
                <label htmlFor="companyName" className={styles.label}>
                    Company Name
                </label>
                <input
                    id="companyName"
                    type="text"
                    className={styles.input}
                    value={companyName}
                    onChange={(e) => onCompanyNameChange(e.target.value)}
                />
            </div>

            {/* Employer Passkey */}
            <div className={styles.formGroup}>
                <label htmlFor="employerPasskey" className={styles.label}>
                    Employer Passkey
                </label>
                <input
                    id="employerPasskey"
                    type="text"
                    className={styles.input}
                    value={employerPasskey}
                    onChange={(e) => onEmployerPasskeyChange(e.target.value)}
                />
            </div>

            {/* Employee Passkey */}
            <div className={styles.formGroup}>
                <label htmlFor="employeePasskey" className={styles.label}>
                    Employee Passkey
                </label>
                <input
                    id="employeePasskey"
                    type="text"
                    className={styles.input}
                    value={employeePasskey}
                    onChange={(e) => onEmployeePasskeyChange(e.target.value)}
                />
            </div>

            {/* Staff Count */}
            <div className={styles.formGroup}>
                <label htmlFor="staffCount" className={styles.label}>
                    Number of Staff
                </label>
                <input
                    id="staffCount"
                    type="number"
                    className={styles.input}
                    value={staffCount}
                    onChange={(e) => onStaffCountChange(e.target.value)}
                />
            </div>

            {/* Save Button */}
            <button
                onClick={onSave}
                className={styles.saveButton}
                disabled={isSaving}
            >
                {isSaving ? "Saving..." : "Save"}
            </button>
        </div>
    );
};

export default SettingsForm;