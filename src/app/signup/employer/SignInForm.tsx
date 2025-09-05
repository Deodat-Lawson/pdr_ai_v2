"use client";

import React, { type FC } from "react";
import { Eye, EyeOff, Building, Lock } from "lucide-react";
import styles from "~/styles/Employer/Signup.module.css";

interface SignInFormData {
    companyName: string;
    managerPasscode: string;
}

interface SignInFormErrors {
    companyName?: string;
    managerPasscode?: string;
}

interface SignInFormProps {
    formData: SignInFormData;
    errors: SignInFormErrors;
    showPassword: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onTogglePassword: () => void;
}

const SignInForm: FC<SignInFormProps> = ({
                                             formData,
                                             errors,
                                             showPassword,
                                             onChange,
                                             onSubmit,
                                             onTogglePassword,
                                         }) => {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
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

            <div className={styles.formGroup}>
                <label className={styles.label}>Manager Passcode</label>
                <div className={styles.inputWrapper}>
                    <Lock className={styles.inputIcon} />
                    <input
                        type={showPassword ? "text" : "password"}
                        name="managerPasscode"
                        value={formData.managerPasscode}
                        onChange={onChange}
                        className={styles.input}
                        placeholder="Enter manager passcode"
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={onTogglePassword}
                    >
                        {showPassword ? <EyeOff className={styles.eyeIcon} /> : <Eye className={styles.eyeIcon} />}
                    </button>
                </div>
                {errors.managerPasscode && (
                    <span className={styles.error}>{errors.managerPasscode}</span>
                )}
            </div>

            <button type="submit" className={styles.submitButton}>
                Sign In
            </button>
        </form>
    );
};

export default SignInForm;