import type SweetAlert from 'sweetalert2';

declare global {
    const Swal: typeof SweetAlert;
}

export {};
