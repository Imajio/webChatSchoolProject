from django import forms


class ContactForm(forms.Form):
    """A simple contact form used to demonstrate send_mail and form validation.

    Fields:
    - recipient: recipient email (required)
    - subject: subject line (required)
    - sender_name: sender's name (required)
    - message: message body (required)
    """

    recipient = forms.EmailField(label="Recipient email", max_length=254)
    subject = forms.CharField(label="Subject", max_length=150)
    sender_name = forms.CharField(label="Your name", max_length=100)
    message = forms.CharField(label="Message", widget=forms.Textarea, max_length=2000)


class RegistrationForm(forms.Form):
    """User registration form with password confirmation and basic validation."""

    username = forms.CharField(label="Username", max_length=150)
    email = forms.EmailField(label="Email", required=False)
    first_name = forms.CharField(label="First name", required=False, max_length=30)
    last_name = forms.CharField(label="Last name", required=False, max_length=150)
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm password", widget=forms.PasswordInput)

    def clean(self):
        """Ensure passwords match and username is unique."""
        cleaned = super().clean()
        p1 = cleaned.get('password1')
        p2 = cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('The two password fields didn\'t match.')
        # Validate username uniqueness here so user gets a form error
        username = cleaned.get('username')
        if username:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if User.objects.filter(username=username).exists():
                raise forms.ValidationError('A user with that username already exists.')
        return cleaned
