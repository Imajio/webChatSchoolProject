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
