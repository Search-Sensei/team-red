import React, { useState } from "react";

interface ITextInputProps {
    required: boolean;
    onChange: (data: { value: string; error: string; touched: boolean; field: string }) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
    id: string;
    label?: string;
    placeholder: string;
    value: string;
    type?: string;
    maxLength?: number;
    inputClass?: string;
    field: string;
    rows?: number;
    autofocus?: boolean;
    hideLabel?: boolean;
    isClearable?: boolean;
}

const TextInput: React.FC<ITextInputProps> = (props) => {
    const [error, setError] = useState("");

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        let currentError = "";

        if (props.required && (!value || value.trim().length === 0)) {
            currentError = "Value cannot be empty";
        } else if (props.maxLength && value && value.length > props.maxLength) {
            currentError = `Value can't have more than ${props.maxLength} characters`;
        }

        setError(currentError);
        props.onChange({ value, error: currentError, touched: true, field: props.field });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (props.onKeyDown) {
            props.onKeyDown(e);
        }
    };

    const inputElement = props.type === "textarea" ? (
        <textarea
            value={props.value}
            onChange={onChange}
            className={`form-control ${props.inputClass || ""}`}
            id={props.id}
            placeholder={props.placeholder}
            rows={props.rows || 3}
        />
    ) : (
        <input
            value={props.value}
            type={props.type || "text"}
            onChange={onChange}
            onKeyDown={onKeyDown}
            className={`form-control ${props.inputClass || ""}`}
            id={props.id}
            placeholder={props.placeholder}
        />
    );

    return (
        <div>
            {props.hideLabel ? null : (
                <label htmlFor={props.id}>
                    {props.label}
                    {props.required ? <small> (required)</small> : ""}
                </label>
            )}
            {inputElement}
            {error && (
                <div className="invalid-feedback d-block">
                    {error}
                </div>
            )}
        </div>
    );
};

export default TextInput;