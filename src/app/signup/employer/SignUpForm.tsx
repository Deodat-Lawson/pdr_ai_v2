"use client";

import React, { type FC } from "react";
import { Eye, EyeOff, Lock, Building, Users } from "lucide-react";
import styles from "~/styles/Employer/Signup.module.css";

// Types for form data & errors
interface SignUpFormData {
    companyName: string;
    managerPasscode: string;
    managerPasscodeConfirm: string;
    employeePasscode: string;
    employeePasscodeConfirm: string;
    staffCount: string;
}

interface SignUpFormErrors {
    companyName?: string;
    managerPasscode?: string;
    managerPasscodeConfirm?: string;
    employeePasscode?: string;
    employeePasscodeConfirm?: string;
    staffCount?: string;
}

interface SignUpFormProps {
    formData: SignUpFormData;
    errors: SignUpFormErrors;
    showPasswords: {
        manager: boolean;
        managerConfirm: boolean;
        employee: boolean;
        employeeConfirm: boolean;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onTogglePassword: (field: keyof SignUpFormProps["showPasswords"]) => void;
}

const SignUpForm: FC<SignUpFormProps> = ({
                                             formData,
                                             errors,
                                             showPasswords,
                                             onChange,
                                             onSubmit,
                                             onTogglePassword,
                                         }) => {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
            {/* Company Name */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Company Name</label>
                <div className={styles.inputWrapper}>
                    <Building className={styles.inputIcon} />
                    <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Enter company name"
                    />
                </div>
                {errors.companyName && (
                    <span className={styles.error}>{errors.companyName}</span>
                )}
            </div>

            {/* Manager Passcode */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Manager Passcode</label>
                <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} />
                    <input
                        type={showPasswords.manager ? "text" : "password"}
                        name="managerPasscode"
                        value={formData.managerPasscode}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Enter manager passcode"
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => onTogglePassword("manager")}
                    >
                        {showPasswords.manager ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                    </button>
                </div>
                {errors.managerPasscode && (
                    <span className={styles.error}>{errors.managerPasscode}</span>
                )}
            </div>

            {/* Confirm Manager Passcode */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Confirm Manager Passcode</label>
                <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} />
                    <input
                        type={showPasswords.managerConfirm ? "text" : "password"}
                        name="managerPasscodeConfirm"
                        value={formData.managerPasscodeConfirm}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Re-enter manager passcode"
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => onTogglePassword("managerConfirm")}
                    >
                        {showPasswords.managerConfirm ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                    </button>
                </div>
                {errors.managerPasscodeConfirm && (
                    <span className={styles.error}>{errors.managerPasscodeConfirm}</span>
                )}
            </div>

            {/* Employee Passcode */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Employee Passcode</label>
                <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} />
                    <input
                        type={showPasswords.employee ? "text" : "password"}
                        name="employeePasscode"
                        value={formData.employeePasscode}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Enter employee passcode"
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => onTogglePassword("employee")}
                    >
                        {showPasswords.employee ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                    </button>
                </div>
                {errors.employeePasscode && (
                    <span className={styles.error}>{errors.employeePasscode}</span>
                )}
            </div>

            {/* Confirm Employee Passcode */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Confirm Employee Passcode</label>
                <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} />
                    <input
                        type={showPasswords.employeeConfirm ? "text" : "password"}
                        name="employeePasscodeConfirm"
                        value={formData.employeePasscodeConfirm}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Re-enter employee passcode"
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => onTogglePassword("employeeConfirm")}
                    >
                        {showPasswords.employeeConfirm ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                    </button>
                </div>
                {errors.employeePasscodeConfirm && (
                    <span className={styles.error}>{errors.employeePasscodeConfirm}</span>
                )}
            </div>

            {/* Staff Count */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Approximate Number of Staff</label>
                <div className={styles.inputWrapper}>
                    <Users className={styles.inputIcon} />
                    <input
                        type="number"
                        name="staffCount"
                        value={formData.staffCount}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Enter staff count"
                        min="1"
                    />
                </div>
                {errors.staffCount && (
                    <span className={styles.error}>{errors.staffCount}</span>
                )}
            </div>

            <button type="submit" className={styles.submitButton}>
                Create Account
            </button>
        </form>
    );
};

export default SignUpForm;